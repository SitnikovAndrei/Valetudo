<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {RawMapData, RawMapEntity} from "../../../frontend/src/api/RawMapData";
import {RawMapEntityType, RawMapLayerType} from "../../../frontend/src/api/RawMapData";
import {MapLayerManager} from "../../../frontend/src/map/MapLayerManager";
import {activated, aprilFools} from "../aprilFools";
import {i18n, translate} from "../i18n";

type Point = {x: number; y: number};
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
const pointers = new Map<number, Point>();
let observer: ResizeObserver | undefined;
let dpr = 1;
let scale = 1;
let fitScale = 1;
let offsetX = 0;
let offsetY = 0;
let initialized = false;
let dragStart: Point | undefined;
let dragCurrent: Point | undefined;
let previousPointer: Point | undefined;
let pinchDistance = 0;
let pinchCenter: Point | undefined;
let layerUpdate = Promise.resolve();
let disposed = false;
let draggedEntity: {index: number; start: Point; points: number[]} | undefined;

function mapPoint(screen: Point): Point {
    return {
        x: Math.max(0, Math.min(props.map.size.x / props.map.pixelSize, (screen.x * dpr - offsetX) / scale)),
        y: Math.max(0, Math.min(props.map.size.y / props.map.pixelSize, (screen.y * dpr - offsetY) / scale))
    };
}

function eventPoint(event: PointerEvent): Point {
    const rect = canvas.value!.getBoundingClientRect();
    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
}

function fitMap() {
    const element = canvas.value;
    if (!element) return;
    const bounds = props.map.layers.reduce((box, layer) => ({
        minX: Math.min(box.minX, layer.dimensions.x.min),
        minY: Math.min(box.minY, layer.dimensions.y.min),
        maxX: Math.max(box.maxX, layer.dimensions.x.max),
        maxY: Math.max(box.maxY, layer.dimensions.y.max)
    }), {
        minX: props.map.size.x / props.map.pixelSize,
        minY: props.map.size.y / props.map.pixelSize,
        maxX: 0,
        maxY: 0
    });
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    scale = Math.max(0.01, Math.min(element.width / (width * 1.1), element.height / (height * 1.1)));
    fitScale = scale;
    offsetX = (element.width - width * scale) / 2 - bounds.minX * scale;
    offsetY = (element.height - height * scale) / 2 - bounds.minY * scale;
    initialized = true;
}

function resize() {
    const element = canvas.value;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const oldWidth = element.width;
    const oldHeight = element.height;
    dpr = window.devicePixelRatio || 1;
    element.width = Math.round(rect.width * dpr);
    element.height = Math.round(rect.height * dpr);
    if (!initialized) {
        fitMap();
    } else if (oldWidth && oldHeight) {
        const factor = Math.min(element.width / oldWidth, element.height / oldHeight);
        scale *= factor;
        fitScale *= factor;
        offsetX = (offsetX - oldWidth / 2) * factor + element.width / 2;
        offsetY = (offsetY - oldHeight / 2) * factor + element.height / 2;
    }
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
            case RawMapEntityType.RobotPosition:
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((entity.metaData.angle ?? 0) * Math.PI / 180);
                ctx.fillStyle = "#f7a844";
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#19352c";
                ctx.beginPath();
                ctx.moveTo(0, -4);
                ctx.lineTo(-2, 0);
                ctx.lineTo(2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                break;
            case RawMapEntityType.ChargerLocation:
                ctx.fillStyle = "#6ccfa0";
                ctx.fillRect(x - 5, y - 5, 10, 10);
                break;
            case RawMapEntityType.GoToTarget:
            case RawMapEntityType.Obstacle:
                ctx.fillStyle = entity.type === RawMapEntityType.Obstacle ? "#ed6772" : "#f7a844";
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
}

function drawSelections(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "6px IBM Plex Sans, sans-serif";
    for (const layer of props.map.layers) {
        if (layer.type !== RawMapLayerType.Segment || !layer.metaData.segmentId) continue;
        const x = layer.dimensions.x.avg;
        const y = layer.dimensions.y.avg;
        const selected = props.selectedSegmentIds.includes(layer.metaData.segmentId);
        ctx.fillStyle = selected ? "#f7a844" : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#19352c";
        ctx.fillText(layer.metaData.name || layer.metaData.segmentId, x, y, 40);
    }
    ctx.strokeStyle = "#f7a844";
    ctx.lineWidth = 2;
    for (const zone of props.zones) {
        ctx.strokeRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
    }
    if ((props.mode === "zones" || props.mode === "rectangle" || props.mode === "line") && dragStart && dragCurrent) {
        const a = mapPoint(dragStart);
        const b = mapPoint(dragCurrent);
        if (props.mode === "line") {ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();}
        else ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    if (props.target) {
        ctx.strokeStyle = "#f7a844";
        ctx.beginPath();
        ctx.arc(props.target.x, props.target.y, 7, 0, Math.PI * 2);
        ctx.stroke();
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
    if (!element || !ctx || !initialized) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers.getCanvas(), 0, 0);
    ctx.imageSmoothingEnabled = true;
    drawEntities(ctx);
    if (!props.coverage) drawSelections(ctx);
    if (aprilFools.value && !activated.value) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = props.paletteMode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(72, 72, 72, 0.5)";
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        ctx.font = `${24 * dpr}px IBM Plex Sans, sans-serif`;
        ctx.fillText(translate("Activate Valetudo"), element.width - 32 * dpr, element.height - 80 * dpr);
        ctx.font = `${14 * dpr}px IBM Plex Sans, sans-serif`;
        ctx.fillText(translate("Go to Settings to activate Valetudo."), element.width - 32 * dpr, element.height - 56 * dpr);
    }
}

function renderLayers() {
    layerUpdate = layerUpdate.then(async () => {
        if (disposed) return;
        layers.setSelectedSegmentIds(props.selectedSegmentIds);
        await layers.draw(props.map, props.paletteMode);
        if (!disposed) draw();
    }).catch(() => { /* A later map update can retry rendering. */ });
}

function zoom(factor: number, at: Point) {
    const nextScale = Math.max(fitScale * 0.3, Math.min(fitScale * 30, scale * factor));
    const world = mapPoint(at);
    scale = nextScale;
    offsetX = at.x * dpr - world.x * scale;
    offsetY = at.y * dpr - world.y * scale;
    draw();
}

function onWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = canvas.value!.getBoundingClientRect();
    zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, {x: event.clientX - rect.left, y: event.clientY - rect.top});
}

function onKeyDown(event: KeyboardEvent) {
    const element = canvas.value;
    if (!element) return;
    if (event.key === "+" || event.key === "=") zoom(1.15, {x: element.clientWidth / 2, y: element.clientHeight / 2});
    else if (event.key === "-") zoom(1 / 1.15, {x: element.clientWidth / 2, y: element.clientHeight / 2});
    else if (event.key === "ArrowLeft") offsetX += 30 * dpr;
    else if (event.key === "ArrowRight") offsetX -= 30 * dpr;
    else if (event.key === "ArrowUp") offsetY += 30 * dpr;
    else if (event.key === "ArrowDown") offsetY -= 30 * dpr;
    else if (event.key === "0") fitMap();
    else return;
    event.preventDefault();
    draw();
}

function onPointerDown(event: PointerEvent) {
    canvas.value?.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    pointers.set(event.pointerId, point);
    dragStart = point;
    dragCurrent = point;
    previousPointer = point;
    if (props.mode === "pan" && props.editableEntities?.length && pointers.size === 1) {
        const world = mapPoint(point);
        const tolerance = 12 * dpr / scale;
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
    if (pointers.size === 2) {
        draggedEntity = undefined;
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        pinchCenter = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    }
}

function onPointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    const point = eventPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchCenter) {
            offsetX += (center.x - pinchCenter.x) * dpr;
            offsetY += (center.y - pinchCenter.y) * dpr;
        }
        if (pinchDistance) zoom(distance / pinchDistance, center);
        pinchDistance = distance;
        pinchCenter = center;
        draw();
    } else if (previousPointer) {
        if (draggedEntity) {
            const current = mapPoint(point);
            const unit = props.map.pixelSize;
            const deltaX = Math.round((current.x - draggedEntity.start.x) * unit);
            const deltaY = Math.round((current.y - draggedEntity.start.y) * unit);
            const points = draggedEntity.points.map((value, index) => value + (index % 2 ? deltaY : deltaX));
            const xs = points.filter((_, index) => index % 2 === 0);
            const ys = points.filter((_, index) => index % 2 === 1);
            if (Math.min(...xs) >= 0 && Math.max(...xs) <= props.map.size.x && Math.min(...ys) >= 0 && Math.max(...ys) <= props.map.size.y) emit("entity-updated", draggedEntity.index, points);
        } else if (["zones", "rectangle", "line"].includes(props.mode)) {
            dragCurrent = point;
        } else {
            offsetX += (point.x - previousPointer.x) * dpr;
            offsetY += (point.y - previousPointer.y) * dpr;
        }
        previousPointer = point;
        draw();
    }
}

function onPointerUp(event: PointerEvent, cancelled = false) {
    if (!pointers.has(event.pointerId)) return;
    const point = eventPoint(event);
    const moved = dragStart ? Math.hypot(point.x - dragStart.x, point.y - dragStart.y) : 0;
    if (cancelled && draggedEntity) emit("entity-updated", draggedEntity.index, draggedEntity.points);
    if (!cancelled && !draggedEntity && pointers.size === 1) {
        if (["zones", "rectangle", "line"].includes(props.mode) && dragStart && moved > 8) {
            const a = mapPoint(dragStart);
            const b = mapPoint(point);
            const shape = {
                a: {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y)},
                b: {x: Math.max(a.x, b.x), y: Math.max(a.y, b.y)}
            };
            if (props.mode === "zones") emit("zone-created", shape);
            else emit("shape-created", props.mode === "line" ? {a, b} : shape);
        } else if (moved < 8 && props.mode === "segments") {
            const p = mapPoint(point);
            const id = layers.getIntersectingSegment(p.x, p.y);
            if (id) emit("segment-click", id);
        } else if (moved < 8 && props.mode === "goto") {
            emit("point-selected", mapPoint(point));
        }
    }
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
        pinchCenter = undefined;
        pinchDistance = 0;
    }
    dragStart = undefined;
    dragCurrent = undefined;
    previousPointer = pointers.values().next().value;
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
