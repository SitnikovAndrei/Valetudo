<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {RawMapData, RawMapEntity} from "../api/RawMapData";
import {RawMapEntityType, RawMapLayerType} from "../api/RawMapData";
import {MapLayerManager} from "../map/MapLayerManager";
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
    "zone-remove": [index: number];
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
type Marker = "robot" | "charger" | "target" | "obstacle" | "segment";

function drawMarker(ctx: CanvasRenderingContext2D, kind: Marker, x: number, y: number, options: {angle?: number; label?: string; selected?: boolean} = {}) {
    const position = viewport.toCanvasPoint({x, y});
    const dark = props.paletteMode === "dark";
    const accent = dark ? "#86cba2" : "#246e53";
    const surface = dark ? "#1d2d26" : "#ffffff";
    const text = dark ? "#edf5ed" : "#19352c";
    ctx.save();
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, position.x, position.y);
    ctx.lineWidth = 2;
    if (kind === "segment") {
        const label = options.label ?? "";
        ctx.font = "700 11px Manrope, sans-serif";
        const width = Math.max(28, Math.min(92, ctx.measureText(label).width + 17));
        ctx.beginPath();
        ctx.roundRect(-width / 2, -13, width, 26, 13);
        ctx.fillStyle = options.selected ? accent : surface;
        ctx.strokeStyle = accent;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = options.selected ? surface : text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 1, width - 12);
    } else if (kind === "robot") {
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.strokeStyle = surface;
        ctx.fill();
        ctx.stroke();
        ctx.rotate((options.angle ?? 0) * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fillStyle = surface;
        ctx.fill();
    } else if (kind === "charger") {
        ctx.beginPath();
        ctx.roundRect(-11, -11, 22, 22, 6);
        ctx.fillStyle = surface;
        ctx.strokeStyle = accent;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, -3);
        ctx.lineTo(-4, 2);
        ctx.quadraticCurveTo(0, 7, 4, 2);
        ctx.lineTo(4, -3);
        ctx.moveTo(-2, -6);
        ctx.lineTo(-2, -3);
        ctx.moveTo(2, -6);
        ctx.lineTo(2, -3);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, kind === "target" ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = surface;
        ctx.strokeStyle = kind === "obstacle" ? "#bd8450" : accent;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, kind === "target" ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = kind === "obstacle" ? "#bd8450" : accent;
        ctx.fill();
    }
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

function polygonPath(ctx: CanvasRenderingContext2D, entity: RawMapEntity) {
    if (entity.points.length < 4) return;
    const unit = props.map.pixelSize;
    ctx.beginPath();
    ctx.moveTo(entity.points[0] / unit, entity.points[1] / unit);
    for (let index = 2; index < entity.points.length; index += 2) {
        ctx.lineTo(entity.points[index] / unit, entity.points[index + 1] / unit);
    }
    if (entity.points.length > 4 && entity.type !== RawMapEntityType.VirtualWall) ctx.closePath();
}

function polygon(ctx: CanvasRenderingContext2D, entity: RawMapEntity) {
    if (entity.points.length < 4) return;
    polygonPath(ctx, entity);
    ctx.stroke();
}

const carpetPatterns = new Map<string, CanvasPattern>();
function drawCarpets(ctx: CanvasRenderingContext2D) {
    const dark = props.paletteMode === "dark";
    let pattern = carpetPatterns.get(props.paletteMode);
    if (!pattern) {
        const tile = document.createElement("canvas");
        tile.width = 8;
        tile.height = 8;
        const tileContext = tile.getContext("2d")!;
        tileContext.fillStyle = dark ? "#5b5643" : "#e7ddc7";
        tileContext.fillRect(0, 0, 8, 8);
        tileContext.strokeStyle = dark ? "#8f876b" : "#c9b890";
        tileContext.lineWidth = 1;
        tileContext.beginPath();
        tileContext.moveTo(-2, 8);
        tileContext.lineTo(8, -2);
        tileContext.moveTo(2, 10);
        tileContext.lineTo(10, 2);
        tileContext.stroke();
        pattern = ctx.createPattern(tile, "repeat")!;
        carpetPatterns.set(props.paletteMode, pattern);
    }
    for (const entity of props.map.entities) {
        if (entity.type !== RawMapEntityType.Carpet || entity.points.length < 6) continue;
        polygonPath(ctx, entity);
        ctx.fillStyle = pattern;
        ctx.fill();
        ctx.strokeStyle = dark ? "#ab9b70" : "#ae996b";
        ctx.lineWidth = Math.max(1, viewport.dpr / viewport.scale);
        ctx.stroke();
    }
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
                ctx.strokeStyle = dark ? "#9ad1a4" : "#65b386";
                ctx.setLineDash(entity.type === RawMapEntityType.PredictedPath ? [3, 3] : []);
                polygon(ctx, entity);
                ctx.setLineDash([]);
                break;
            case RawMapEntityType.NoGoArea:
            case RawMapEntityType.NoMopArea:
            case RawMapEntityType.VirtualWall:
                ctx.strokeStyle = entity.type === RawMapEntityType.NoMopArea ? "#bf934a" : "#c96b67";
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Threshold:
            case RawMapEntityType.Curtain:
            case RawMapEntityType.Ramp:
                ctx.strokeStyle = dark ? "#a7c7b8" : "#729a88";
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.ActiveZone:
                ctx.strokeStyle = dark ? "#86cba2" : "#246e53";
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Obstacle:
                drawMarker(ctx, "obstacle", x, y);
                break;
        }
    }
}

function drawSegmentLabels(ctx: CanvasRenderingContext2D) {
    for (const layer of props.map.layers) {
        if (layer.type !== RawMapLayerType.Segment || !layer.metaData.segmentId) continue;
        const {x, y} = getSegmentLabelPoint(layer);
        const selected = props.selectedSegmentIds.includes(layer.metaData.segmentId);
        const label = layer.metaData.name || layer.metaData.segmentId;
        drawMarker(ctx, "segment", x, y, {label, selected});
    }
}

function drawForegroundIcons(ctx: CanvasRenderingContext2D) {
    for (const type of [RawMapEntityType.GoToTarget, RawMapEntityType.ChargerLocation, RawMapEntityType.RobotPosition]) {
        for (const entity of props.map.entities) {
            if (entity.type !== type) continue;
            const x = entity.points[0] / props.map.pixelSize;
            const y = entity.points[1] / props.map.pixelSize;
            if (type === RawMapEntityType.GoToTarget) drawMarker(ctx, "target", x, y);
            else if (type === RawMapEntityType.ChargerLocation) drawMarker(ctx, "charger", x, y);
            else drawMarker(ctx, "robot", x, y, {angle: entity.metaData.angle});
        }
    }
}

function zoneDeletePoint(zone: MapZone): Point {
    const topRight = viewport.toCanvasPoint({x: zone.b.x, y: zone.a.y});
    const width = canvas.value?.clientWidth ?? viewport.width / viewport.dpr;
    const height = canvas.value?.clientHeight ?? viewport.height / viewport.dpr;
    return {
        x: Math.max(18, Math.min(width - 18, topRight.x / viewport.dpr - 14)),
        y: Math.max(18, Math.min(height - 18, topRight.y / viewport.dpr + 14))
    };
}

function drawInteractionOverlays(ctx: CanvasRenderingContext2D) {
    const dark = props.paletteMode === "dark";
    ctx.strokeStyle = dark ? "#86cba2" : "#246e53";
    ctx.fillStyle = dark ? "rgba(134, 203, 162, .20)" : "rgba(36, 110, 83, .16)";
    ctx.lineWidth = 2 * viewport.dpr / viewport.scale;
    for (const zone of props.zones) {
        ctx.fillRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
        ctx.strokeRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
        if (props.mode === "zones") {
            const point = zoneDeletePoint(zone);
            ctx.save();
            ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, point.x * viewport.dpr, point.y * viewport.dpr);
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fillStyle = dark ? "#1d2d26" : "#ffffff";
            ctx.strokeStyle = dark ? "#86cba2" : "#246e53";
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-4, -4);
            ctx.lineTo(4, 4);
            ctx.moveTo(4, -4);
            ctx.lineTo(-4, 4);
            ctx.stroke();
            ctx.restore();
        }
    }
    const preview = gestures.preview;
    if ((props.mode === "zones" || props.mode === "rectangle" || props.mode === "line") && preview) {
        const a = mapPoint(preview.start);
        const b = mapPoint(preview.current);
        if (props.mode === "line") {ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();}
        else ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    if (props.target) {
        drawMarker(ctx, "target", props.target.x, props.target.y);
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
    drawCarpets(ctx);
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

function zoomIn() {
    if (!canvas.value) return;
    viewport.zoom(1.2, {x: canvas.value.clientWidth / 2, y: canvas.value.clientHeight / 2});
    draw();
}

function zoomOut() {
    if (!canvas.value) return;
    viewport.zoom(1 / 1.2, {x: canvas.value.clientWidth / 2, y: canvas.value.clientHeight / 2});
    draw();
}

defineExpose({zoomIn, zoomOut, fitMap: () => {resize(); fitMap(); draw();}});

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
        if (gesture.tap && props.mode === "zones") {
            for (let index = props.zones.length - 1; index >= 0; index--) {
                const deletePoint = zoneDeletePoint(props.zones[index]);
                if ((point.x - deletePoint.x) ** 2 + (point.y - deletePoint.y) ** 2 <= 18 ** 2) {
                    emit("zone-remove", index);
                    draggedEntity = undefined;
                    draw();
                    return;
                }
            }
        }
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
