<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {RawMapData, RawMapEntity} from "../../../frontend/src/api/RawMapData";
import {RawMapEntityType, RawMapLayerType} from "../../../frontend/src/api/RawMapData";
import {MapLayerManager} from "../../../frontend/src/map/MapLayerManager";
import robotIcon from "../../../frontend/src/map/structures/icons/robot.svg";
import chargerIcon from "../../../frontend/src/map/structures/icons/charger.svg";
import targetIcon from "../../../frontend/src/map/structures/icons/marker.svg";
import activeTargetIcon from "../../../frontend/src/map/structures/icons/marker_active.svg";
import obstacleIcon from "../../../frontend/src/map/structures/icons/obstacle.svg";
import segmentIcon from "../../../frontend/src/map/structures/icons/segment.svg";
import selectedSegmentIcon from "../../../frontend/src/map/structures/icons/segment_selected.svg";
import {activated, aprilFools} from "../aprilFools";
import {i18n, translate} from "../i18n";
import {MapViewport, type Point} from "../map/MapViewport";
import {MapGestures} from "../map/MapGestures";
import {getSegmentLabelAtPoint, getSegmentLabelPoint} from "../map/SegmentLabelHitTest";
import {prepareMapWorkerInput} from "../map/MapWorkerInput";

type MapZone = {a: Point; b: Point};
type Mode = "segments" | "zones" | "goto" | "pan" | "line" | "rectangle";
const props = defineProps<{
    map: RawMapData;
    paletteMode: "light" | "dark";
    mode: Mode;
    selectedSegmentIds: string[];
    zones: MapZone[];
    target?: Point;
    editLine?: MapZone;
    coverage?: boolean;
    editableEntities?: RawMapEntity[];
}>();
const emit = defineEmits<{
    "segment-click": [id: string];
    "zone-created": [zone: MapZone];
    "point-selected": [point: Point];
    "shape-created": [shape: MapZone];
    "entity-updated": [index: number, points: number[]];
}>();

const canvas = ref<HTMLCanvasElement>();
const layers = new MapLayerManager();
const viewport = new MapViewport();
const gestures = new MapGestures();
let observer: ResizeObserver | undefined;
let layerUpdate = Promise.resolve();
let disposed = false;
let draggedEntity: {index: number; start: Point; points: number[]} | undefined;
const icons = {
    robot: new Image(),
    charger: new Image(),
    target: new Image(),
    activeTarget: new Image(),
    obstacle: new Image(),
    segment: new Image(),
    selectedSegment: new Image()
};
icons.robot.src = robotIcon;
icons.charger.src = chargerIcon;
icons.target.src = targetIcon;
icons.activeTarget.src = activeTargetIcon;
icons.obstacle.src = obstacleIcon;
icons.segment.src = segmentIcon;
icons.selectedSegment.src = selectedSegmentIcon;
Object.values(icons).forEach(icon => { icon.onload = () => draw(); });

function drawIcon(ctx: CanvasRenderingContext2D, icon: HTMLImageElement, x: number, y: number, divisor: number, anchorY = 0.5, angle = 0) {
    if (!icon.complete || !icon.naturalWidth) return;
    const width = icon.naturalWidth * viewport.scale / divisor;
    const height = icon.naturalHeight * viewport.scale / divisor;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const position = viewport.toCanvasPoint({x, y});
    ctx.translate(position.x, position.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(icon, -width / 2, -height * anchorY, width, height);
    ctx.restore();
}

function mapPoint(screen: Point): Point {
    return viewport.toMapPoint(screen, props.map);
}

function eventPoint(event: PointerEvent): Point {
    const rect = canvas.value!.getBoundingClientRect();
    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
}

function fitMap() {
    viewport.fit(props.map);
}

function resize() {
    const element = canvas.value;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (element.width !== width) element.width = width;
    if (element.height !== height) element.height = height;
    viewport.resize(width, height, dpr, props.map);
    draw();
}

function polygon(ctx: CanvasRenderingContext2D, entity: RawMapEntity) {
    if (entity.points.length < 4) return;
    const unit = props.map.pixelSize;
    ctx.beginPath();
    ctx.moveTo(entity.points[0] / unit, entity.points[1] / unit);
    for (let index = 2; index < entity.points.length; index += 2) {
        ctx.lineTo(entity.points[index] / unit, entity.points[index + 1] / unit);
    }
    if (entity.points.length > 4 && entity.type !== RawMapEntityType.VirtualWall) ctx.closePath();
    ctx.stroke();
}

function drawEntities(ctx: CanvasRenderingContext2D) {
    const dark = props.paletteMode === "dark";
    for (const entity of props.map.entities) {
        const x = entity.points[0] / props.map.pixelSize;
        const y = entity.points[1] / props.map.pixelSize;
        ctx.lineWidth = props.coverage && entity.type === RawMapEntityType.Path ? 5 : 1.5;
        switch (entity.type) {
            case RawMapEntityType.Path:
            case RawMapEntityType.PredictedPath:
                ctx.strokeStyle = dark ? "#ffffff" : "#e1ece3";
                ctx.setLineDash(entity.type === RawMapEntityType.PredictedPath ? [3, 3] : []);
                polygon(ctx, entity);
                ctx.setLineDash([]);
                break;
            case RawMapEntityType.NoGoArea:
            case RawMapEntityType.NoMopArea:
            case RawMapEntityType.VirtualWall:
                ctx.strokeStyle = entity.type === RawMapEntityType.NoMopArea ? "#f7a844" : "#ed6772";
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Threshold:
            case RawMapEntityType.Curtain:
            case RawMapEntityType.Ramp:
                ctx.strokeStyle = "#78a9f3";
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.ActiveZone:
                ctx.strokeStyle = "#6ccfa0";
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Obstacle:
                drawIcon(ctx, icons.obstacle, x, y, 8);
                break;
        }
    }
}

function drawSegmentLabels(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "6px IBM Plex Sans, sans-serif";
    for (const layer of props.map.layers) {
        if (layer.type !== RawMapLayerType.Segment || !layer.metaData.segmentId) continue;
        const {x, y} = getSegmentLabelPoint(layer);
        const selected = props.selectedSegmentIds.includes(layer.metaData.segmentId);
        drawIcon(ctx, selected ? icons.selectedSegment : icons.segment, x, y, 4, 2 / 3, layer.metaData.active ? 180 : 0);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 0.8;
        const label = layer.metaData.name || layer.metaData.segmentId;
        ctx.strokeText(label, x, y + 7, 40);
        ctx.fillText(label, x, y + 7, 40);
    }
}

function drawForegroundIcons(ctx: CanvasRenderingContext2D) {
    for (const type of [RawMapEntityType.GoToTarget, RawMapEntityType.ChargerLocation, RawMapEntityType.RobotPosition]) {
        for (const entity of props.map.entities) {
            if (entity.type !== type) continue;
            const x = entity.points[0] / props.map.pixelSize;
            const y = entity.points[1] / props.map.pixelSize;
            if (type === RawMapEntityType.GoToTarget) drawIcon(ctx, icons.activeTarget, x, y, 7, 1);
            else if (type === RawMapEntityType.ChargerLocation) drawIcon(ctx, icons.charger, x, y, 4.5);
            else drawIcon(ctx, icons.robot, x, y, 4.5, 0.5, entity.metaData.angle ?? 0);
        }
    }
}

function drawInteractionOverlays(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#f7a844";
    ctx.lineWidth = 2;
    for (const zone of props.zones) {
        ctx.strokeRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
    }
    const preview = gestures.preview;
    if ((props.mode === "zones" || props.mode === "rectangle" || props.mode === "line") && preview) {
        const a = mapPoint(preview.start);
        const b = mapPoint(preview.current);
        if (props.mode === "line") {ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();}
        else ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    if (props.target) {
        drawIcon(ctx, icons.target, props.target.x, props.target.y, 7, 1);
    }
    if (props.editLine) {
        ctx.strokeStyle = "#f7a844";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(props.editLine.a.x, props.editLine.a.y);
        ctx.lineTo(props.editLine.b.x, props.editLine.b.y);
        ctx.stroke();
    }
}

function draw() {
    const element = canvas.value;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || !viewport.initialized) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers.getCanvas(), 0, 0);
    ctx.imageSmoothingEnabled = true;
    drawEntities(ctx);
    if (!props.coverage) drawSegmentLabels(ctx);
    drawForegroundIcons(ctx);
    if (!props.coverage) drawInteractionOverlays(ctx);
    if (aprilFools.value && !activated.value) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = props.paletteMode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(72, 72, 72, 0.5)";
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        ctx.font = `${24 * viewport.dpr}px IBM Plex Sans, sans-serif`;
        ctx.fillText(translate("Activate Valetudo"), element.width - 32 * viewport.dpr, element.height - 80 * viewport.dpr);
        ctx.font = `${14 * viewport.dpr}px IBM Plex Sans, sans-serif`;
        ctx.fillText(translate("Go to Settings to activate Valetudo."), element.width - 32 * viewport.dpr, element.height - 56 * viewport.dpr);
    }
}

function renderLayers() {
    layerUpdate = layerUpdate.then(async () => {
        if (disposed) return;
        const input = prepareMapWorkerInput(props.map, props.selectedSegmentIds);
        layers.setSelectedSegmentIds(input.selectedSegmentIds);
        await layers.draw(input.map, props.paletteMode);
        if (!disposed) draw();
    }).catch(() => { /* A later map update can retry rendering. */ });
}

function onWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = canvas.value!.getBoundingClientRect();
    viewport.zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, {x: event.clientX - rect.left, y: event.clientY - rect.top});
    draw();
}

function onKeyDown(event: KeyboardEvent) {
    const element = canvas.value;
    if (!element) return;
    if (event.key === "+" || event.key === "=") viewport.zoom(1.15, {x: element.clientWidth / 2, y: element.clientHeight / 2});
    else if (event.key === "-") viewport.zoom(1 / 1.15, {x: element.clientWidth / 2, y: element.clientHeight / 2});
    else if (event.key === "ArrowLeft") viewport.pan({x: 30, y: 0});
    else if (event.key === "ArrowRight") viewport.pan({x: -30, y: 0});
    else if (event.key === "ArrowUp") viewport.pan({x: 0, y: 30});
    else if (event.key === "ArrowDown") viewport.pan({x: 0, y: -30});
    else if (event.key === "0") fitMap();
    else return;
    event.preventDefault();
    draw();
}

function onPointerDown(event: PointerEvent) {
    canvas.value?.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    gestures.startPointer(event.pointerId, point);
    if (props.mode === "pan" && props.editableEntities?.length && gestures.pointerCount === 1) {
        const world = mapPoint(point);
        const tolerance = 12 * viewport.worldUnitsPerCssPixel;
        for (let index = props.editableEntities.length - 1; index >= 0; index--) {
            const entity = props.editableEntities[index];
            const xs = entity.points.filter((_, coordinate) => coordinate % 2 === 0).map(value => value / props.map.pixelSize);
            const ys = entity.points.filter((_, coordinate) => coordinate % 2 === 1).map(value => value / props.map.pixelSize);
            if (world.x >= Math.min(...xs) - tolerance && world.x <= Math.max(...xs) + tolerance && world.y >= Math.min(...ys) - tolerance && world.y <= Math.max(...ys) + tolerance) {
                draggedEntity = {index, start: world, points: [...entity.points]};
                break;
            }
        }
    }
    if (gestures.pointerCount === 2) {
        if (draggedEntity) emit("entity-updated", draggedEntity.index, draggedEntity.points);
        draggedEntity = undefined;
    }
}

function onPointerMove(event: PointerEvent) {
    const point = eventPoint(event);
    const gesture = gestures.movePointer(event.pointerId, point);
    if (!gesture) return;
    if (gesture.kind === "pinch") {
        viewport.pan(gesture.pan);
        viewport.zoom(gesture.factor, gesture.center);
    } else {
        if (draggedEntity) {
            const current = mapPoint(point);
            const unit = props.map.pixelSize;
            const deltaX = Math.round((current.x - draggedEntity.start.x) * unit);
            const deltaY = Math.round((current.y - draggedEntity.start.y) * unit);
            const points = draggedEntity.points.map((value, index) => value + (index % 2 ? deltaY : deltaX));
            const xs = points.filter((_, index) => index % 2 === 0);
            const ys = points.filter((_, index) => index % 2 === 1);
            if (Math.min(...xs) >= 0 && Math.max(...xs) <= props.map.size.x && Math.min(...ys) >= 0 && Math.max(...ys) <= props.map.size.y) emit("entity-updated", draggedEntity.index, points);
        } else if (!(["zones", "rectangle", "line"].includes(props.mode) && !gesture.afterPinch)) {
            viewport.pan({x: point.x - gesture.previous.x, y: point.y - gesture.previous.y});
        }
    }
    draw();
}

function onPointerUp(event: PointerEvent, cancelled = false) {
    const point = eventPoint(event);
    const gesture = gestures.endPointer(event.pointerId, point, cancelled);
    if (!gesture) return;
    if (cancelled && draggedEntity) emit("entity-updated", draggedEntity.index, draggedEntity.points);
    if (!cancelled && !draggedEntity && !gesture.afterPinch && gestures.pointerCount === 0) {
        if (["zones", "rectangle", "line"].includes(props.mode) && gesture.moved > 8) {
            const a = mapPoint(gesture.start);
            const b = mapPoint(point);
            const shape = {
                a: {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y)},
                b: {x: Math.max(a.x, b.x), y: Math.max(a.y, b.y)}
            };
            if (props.mode === "zones") emit("zone-created", shape);
            else emit("shape-created", props.mode === "line" ? {a, b} : shape);
        } else if (gesture.tap && props.mode === "segments") {
            const p = viewport.toWorldPoint(point);
            const ctx = canvas.value?.getContext("2d");
            if (ctx) ctx.font = "6px IBM Plex Sans, sans-serif";
            const labelId = getSegmentLabelAtPoint(props.map.layers, p, label => ctx?.measureText(label).width ?? 0);
            const id = labelId ?? layers.getIntersectingSegment(p.x, p.y);
            if (id) emit("segment-click", id);
        } else if (gesture.tap && props.mode === "goto") {
            emit("point-selected", mapPoint(point));
        }
    }
    draggedEntity = undefined;
    draw();
}

watch(() => [props.map.metaData.nonce, props.paletteMode, props.selectedSegmentIds.join("|")], renderLayers);
watch(() => props.map.entities, draw, {deep: true});
watch(() => [props.zones, props.target, props.mode, props.editLine], draw);
watch([aprilFools, activated], draw);
watch(i18n.global.locale, draw);
onMounted(() => {
    observer = new ResizeObserver(resize);
    observer.observe(canvas.value!);
    resize();
    renderLayers();
});
onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
    layers.dispose();
});
</script>

<template>
    <canvas ref="canvas" class="h-full w-full touch-none" :aria-label='$t("Robot map; arrows pan, plus and minus zoom, zero fits")' tabindex="0"
        @wheel="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove"
        @pointerup="onPointerUp" @pointercancel="event => onPointerUp(event, true)" @keydown="onKeyDown" />
</template>
