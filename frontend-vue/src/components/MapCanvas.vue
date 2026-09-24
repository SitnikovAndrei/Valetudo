<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {RawMapData, RawMapEntity} from "../api/RawMapData";
import {RawMapEntityType, RawMapLayerType} from "../api/RawMapData";
import {MapLayerManager} from "../map/MapLayerManager";
import {activated, aprilFools} from "../aprilFools";
import {locale, translate} from "../i18n";
import {MapViewport, type Point} from "../map/MapViewport";
import {MapGestures} from "../map/MapGestures";
import {getSegmentLabelAtScreenPoint, getSegmentLabelPoint, SEGMENT_LABEL, segmentLabelText, segmentLabelWidth} from "../map/SegmentLabelHitTest";
import {prepareMapWorkerInput} from "../map/MapWorkerInput";
import {readMapTheme, type MapTheme} from "../map/MapTheme";

type MapZone = {a: Point; b: Point};
type Mode = "segments" | "zones" | "goto" | "pan" | "line" | "rectangle";
type Marker = "robot" | "charger" | "target" | "obstacle" | "segment";
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

const DRAW_MODES: Mode[] = ["zones", "rectangle", "line"];
const ZONE_DELETE_RADIUS = 14;

const canvas = ref<HTMLCanvasElement>();
const layers = new MapLayerManager();
const viewport = new MapViewport();
const gestures = new MapGestures();
let observer: ResizeObserver | undefined;
let layerUpdate = Promise.resolve();
let disposed = false;
let frame = 0;
let theme: MapTheme | undefined;
let draggedEntity: {index: number; start: Point; points: number[]} | undefined;
const carpetPatterns = new Map<string, CanvasPattern>();

/** Colors come from CSS custom properties so the map follows the same tokens as the rest of the UI. */
function colors(): MapTheme {
    if (!theme || theme.mode !== props.paletteMode) theme = readMapTheme(props.paletteMode);
    return theme;
}

/** Coalesces redraws into one per animation frame; pointer events can fire far more often than the screen refreshes. */
function scheduleDraw() {
    if (frame || disposed) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
    });
}

function context(): CanvasRenderingContext2D | null | undefined {
    return canvas.value?.getContext("2d");
}

function toCssPoint(world: Point): Point {
    const point = viewport.toCanvasPoint(world);
    return {x: point.x / viewport.dpr, y: point.y / viewport.dpr};
}

function drawMarker(ctx: CanvasRenderingContext2D, kind: Marker, x: number, y: number, options: {angle?: number; label?: string; selected?: boolean} = {}) {
    const {accent, surface, text, obstacle} = colors();
    const position = viewport.toCanvasPoint({x, y});
    ctx.save();
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, position.x, position.y);
    ctx.lineWidth = 2;
    if (kind === "segment") {
        const label = options.label ?? "";
        ctx.font = SEGMENT_LABEL.font;
        const width = segmentLabelWidth(ctx.measureText(label).width);
        const height = SEGMENT_LABEL.height;
        ctx.beginPath();
        ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
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
        const color = kind === "obstacle" ? obstacle : accent;
        ctx.beginPath();
        ctx.arc(0, 0, kind === "target" ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = surface;
        ctx.strokeStyle = color;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, kind === "target" ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.restore();
}

function mapPoint(screen: Point): Point {
    return viewport.toMapPoint(screen, props.map);
}

function eventPoint(event: PointerEvent | WheelEvent): Point {
    const rect = canvas.value!.getBoundingClientRect();
    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
}

function canvasCenter(): Point {
    return {x: (canvas.value?.clientWidth ?? 0) / 2, y: (canvas.value?.clientHeight ?? 0) / 2};
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

function carpetPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
    const {carpetFill, carpetLine} = colors();
    const key = `${carpetFill}|${carpetLine}`;
    let pattern = carpetPatterns.get(key);
    if (!pattern) {
        const tile = document.createElement("canvas");
        tile.width = 8;
        tile.height = 8;
        const tileContext = tile.getContext("2d")!;
        tileContext.fillStyle = carpetFill;
        tileContext.fillRect(0, 0, 8, 8);
        tileContext.strokeStyle = carpetLine;
        tileContext.lineWidth = 1;
        tileContext.beginPath();
        tileContext.moveTo(-2, 8);
        tileContext.lineTo(8, -2);
        tileContext.moveTo(2, 10);
        tileContext.lineTo(10, 2);
        tileContext.stroke();
        pattern = ctx.createPattern(tile, "repeat")!;
        carpetPatterns.set(key, pattern);
    }
    return pattern;
}

function drawCarpets(ctx: CanvasRenderingContext2D) {
    const pattern = carpetPattern(ctx);
    for (const entity of props.map.entities) {
        if (entity.type !== RawMapEntityType.Carpet || entity.points.length < 6) continue;
        polygonPath(ctx, entity);
        ctx.fillStyle = pattern;
        ctx.fill();
        ctx.strokeStyle = colors().carpetBorder;
        ctx.lineWidth = Math.max(1, viewport.dpr / viewport.scale);
        ctx.stroke();
    }
}

function drawEntities(ctx: CanvasRenderingContext2D) {
    const palette = colors();
    for (const entity of props.map.entities) {
        ctx.lineWidth = props.coverage && entity.type === RawMapEntityType.Path ? 5 : 1.5;
        switch (entity.type) {
            case RawMapEntityType.Path:
            case RawMapEntityType.PredictedPath:
                ctx.strokeStyle = palette.path;
                ctx.setLineDash(entity.type === RawMapEntityType.PredictedPath ? [3, 3] : []);
                polygon(ctx, entity);
                ctx.setLineDash([]);
                break;
            case RawMapEntityType.NoGoArea:
            case RawMapEntityType.NoMopArea:
            case RawMapEntityType.VirtualWall:
                ctx.strokeStyle = entity.type === RawMapEntityType.NoMopArea ? palette.noMop : palette.noGo;
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Threshold:
            case RawMapEntityType.Curtain:
            case RawMapEntityType.Ramp:
                ctx.strokeStyle = palette.structure;
                ctx.lineWidth = 2;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.ActiveZone:
                ctx.strokeStyle = palette.accent;
                polygon(ctx, entity);
                break;
            case RawMapEntityType.Obstacle:
                drawMarker(ctx, "obstacle", entity.points[0] / props.map.pixelSize, entity.points[1] / props.map.pixelSize);
                break;
        }
    }
}

function drawSegmentLabels(ctx: CanvasRenderingContext2D) {
    for (const layer of props.map.layers) {
        if (layer.type !== RawMapLayerType.Segment || !layer.metaData.segmentId) continue;
        const {x, y} = getSegmentLabelPoint(layer);
        drawMarker(ctx, "segment", x, y, {label: segmentLabelText(layer), selected: props.selectedSegmentIds.includes(layer.metaData.segmentId)});
    }
}

function drawForegroundIcons(ctx: CanvasRenderingContext2D) {
    const order = [RawMapEntityType.GoToTarget, RawMapEntityType.ChargerLocation, RawMapEntityType.RobotPosition];
    for (const type of order) {
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

/** Position of a zone's remove button in CSS pixels, kept inside the canvas. */
function zoneDeletePoint(zone: MapZone): Point {
    const topRight = toCssPoint({x: zone.b.x, y: zone.a.y});
    const width = canvas.value?.clientWidth ?? viewport.width / viewport.dpr;
    const height = canvas.value?.clientHeight ?? viewport.height / viewport.dpr;
    const margin = ZONE_DELETE_RADIUS + 4;
    return {
        x: Math.max(margin, Math.min(width - margin, topRight.x - ZONE_DELETE_RADIUS)),
        y: Math.max(margin, Math.min(height - margin, topRight.y + ZONE_DELETE_RADIUS))
    };
}

function drawZoneDeleteButton(ctx: CanvasRenderingContext2D, zone: MapZone) {
    const {accent, surface} = colors();
    const point = zoneDeletePoint(zone);
    ctx.save();
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, point.x * viewport.dpr, point.y * viewport.dpr);
    ctx.beginPath();
    ctx.arc(0, 0, ZONE_DELETE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = surface;
    ctx.strokeStyle = accent;
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

function drawInteractionOverlays(ctx: CanvasRenderingContext2D) {
    const {accent, zoneFill, editLine} = colors();
    ctx.strokeStyle = accent;
    ctx.fillStyle = zoneFill;
    ctx.lineWidth = 2 * viewport.dpr / viewport.scale;
    for (const zone of props.zones) {
        ctx.fillRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
        ctx.strokeRect(zone.a.x, zone.a.y, zone.b.x - zone.a.x, zone.b.y - zone.a.y);
    }
    if (props.mode === "zones") props.zones.forEach(zone => drawZoneDeleteButton(ctx, zone));
    const preview = gestures.preview;
    if (DRAW_MODES.includes(props.mode) && preview) {
        const a = mapPoint(preview.start);
        const b = mapPoint(preview.current);
        ctx.strokeStyle = accent;
        if (props.mode === "line") {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        } else {
            ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        }
    }
    if (props.target) drawMarker(ctx, "target", props.target.x, props.target.y);
    if (props.editLine) {
        ctx.strokeStyle = editLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(props.editLine.a.x, props.editLine.a.y);
        ctx.lineTo(props.editLine.b.x, props.editLine.b.y);
        ctx.stroke();
    }
}

function drawActivationNotice(ctx: CanvasRenderingContext2D, element: HTMLCanvasElement) {
    const {mode} = colors();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(72, 72, 72, 0.5)";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${24 * viewport.dpr}px Onest, sans-serif`;
    ctx.fillText(translate("Activate Valetudo"), element.width - 32 * viewport.dpr, element.height - 80 * viewport.dpr);
    ctx.font = `${14 * viewport.dpr}px Onest, sans-serif`;
    ctx.fillText(translate("Go to Settings to activate Valetudo."), element.width - 32 * viewport.dpr, element.height - 56 * viewport.dpr);
}

function draw() {
    const element = canvas.value;
    const ctx = context();
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
    if (aprilFools.value && !activated.value) drawActivationNotice(ctx, element);
}

function renderLayers() {
    layerUpdate = layerUpdate.then(async () => {
        if (disposed) return;
        const input = prepareMapWorkerInput(props.map, props.selectedSegmentIds);
        layers.setSelectedSegmentIds(input.selectedSegmentIds);
        await layers.draw(input.map, props.paletteMode);
        scheduleDraw();
    }).catch(() => { /* A later map update can retry rendering. */ });
}

function zoomBy(factor: number, at: Point = canvasCenter()) {
    viewport.zoom(factor, at);
    scheduleDraw();
}

function onWheel(event: WheelEvent) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, eventPoint(event));
}

defineExpose({
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
    fitMap: () => {
        resize();
        viewport.fit(props.map);
        draw();
    }
});

const keyActions: Record<string, () => void> = {
    "+": () => viewport.zoom(1.15, canvasCenter()),
    "=": () => viewport.zoom(1.15, canvasCenter()),
    "-": () => viewport.zoom(1 / 1.15, canvasCenter()),
    ArrowLeft: () => viewport.pan({x: 30, y: 0}),
    ArrowRight: () => viewport.pan({x: -30, y: 0}),
    ArrowUp: () => viewport.pan({x: 0, y: 30}),
    ArrowDown: () => viewport.pan({x: 0, y: -30}),
    "0": () => viewport.fit(props.map)
};

function onKeyDown(event: KeyboardEvent) {
    const action = keyActions[event.key];
    if (!action || !canvas.value) return;
    action();
    event.preventDefault();
    scheduleDraw();
}

function entityBounds(points: number[]) {
    const xs = points.filter((_, index) => index % 2 === 0);
    const ys = points.filter((_, index) => index % 2 === 1);
    return {minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys)};
}

function findEditableEntity(world: Point): number {
    const entities = props.editableEntities ?? [];
    const tolerance = 12 * viewport.worldUnitsPerCssPixel;
    const unit = props.map.pixelSize;
    for (let index = entities.length - 1; index >= 0; index--) {
        const box = entityBounds(entities[index].points);
        if (world.x >= box.minX / unit - tolerance && world.x <= box.maxX / unit + tolerance && world.y >= box.minY / unit - tolerance && world.y <= box.maxY / unit + tolerance) return index;
    }
    return -1;
}

function onPointerDown(event: PointerEvent) {
    canvas.value?.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    gestures.startPointer(event.pointerId, point);
    if (props.mode === "pan" && props.editableEntities?.length && gestures.pointerCount === 1) {
        const world = mapPoint(point);
        const index = findEditableEntity(world);
        if (index >= 0) draggedEntity = {index, start: world, points: [...props.editableEntities[index].points]};
    }
    if (gestures.pointerCount === 2 && draggedEntity) {
        // A second finger turns the gesture into a pinch; put the dragged entity back.
        emit("entity-updated", draggedEntity.index, draggedEntity.points);
        draggedEntity = undefined;
    }
}

function dragEntity(point: Point) {
    if (!draggedEntity) return;
    const current = mapPoint(point);
    const unit = props.map.pixelSize;
    const deltaX = Math.round((current.x - draggedEntity.start.x) * unit);
    const deltaY = Math.round((current.y - draggedEntity.start.y) * unit);
    const points = draggedEntity.points.map((value, index) => value + (index % 2 ? deltaY : deltaX));
    const box = entityBounds(points);
    if (box.minX >= 0 && box.maxX <= props.map.size.x && box.minY >= 0 && box.maxY <= props.map.size.y) emit("entity-updated", draggedEntity.index, points);
}

function onPointerMove(event: PointerEvent) {
    const point = eventPoint(event);
    const gesture = gestures.movePointer(event.pointerId, point);
    if (!gesture) return;
    if (gesture.kind === "pinch") {
        viewport.pan(gesture.pan);
        viewport.zoom(gesture.factor, gesture.center);
    } else if (draggedEntity) {
        dragEntity(point);
    } else if (!DRAW_MODES.includes(props.mode) || gesture.afterPinch) {
        viewport.pan({x: point.x - gesture.previous.x, y: point.y - gesture.previous.y});
    }
    scheduleDraw();
}

function hitZoneDeleteButton(point: Point): number {
    for (let index = props.zones.length - 1; index >= 0; index--) {
        const button = zoneDeletePoint(props.zones[index]);
        if ((point.x - button.x) ** 2 + (point.y - button.y) ** 2 <= (ZONE_DELETE_RADIUS + 4) ** 2) return index;
    }
    return -1;
}

function segmentAt(point: Point): string | null {
    const ctx = context();
    if (ctx) ctx.font = SEGMENT_LABEL.font;
    const label = getSegmentLabelAtScreenPoint(props.map.layers, point, toCssPoint, text => ctx?.measureText(text).width ?? 0);
    if (label) return label;
    const world = viewport.toWorldPoint(point);
    return layers.getIntersectingSegment(world.x, world.y);
}

function onPointerUp(event: PointerEvent, cancelled = false) {
    const point = eventPoint(event);
    const gesture = gestures.endPointer(event.pointerId, point, cancelled);
    if (!gesture) return;
    if (cancelled && draggedEntity) emit("entity-updated", draggedEntity.index, draggedEntity.points);
    if (!cancelled && !draggedEntity && !gesture.afterPinch && gestures.pointerCount === 0) handleGestureEnd(point, gesture.tap, gesture.start, gesture.moved);
    draggedEntity = undefined;
    scheduleDraw();
}

function handleGestureEnd(point: Point, tap: boolean, start: Point, moved: number) {
    if (tap && props.mode === "zones") {
        const index = hitZoneDeleteButton(point);
        if (index >= 0) {
            emit("zone-remove", index);
            return;
        }
    }
    if (DRAW_MODES.includes(props.mode) && moved > 8) {
        const a = mapPoint(start);
        const b = mapPoint(point);
        const shape = {
            a: {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y)},
            b: {x: Math.max(a.x, b.x), y: Math.max(a.y, b.y)}
        };
        if (props.mode === "zones") emit("zone-created", shape);
        else emit("shape-created", props.mode === "line" ? {a, b} : shape);
    } else if (tap && props.mode === "segments") {
        const id = segmentAt(point);
        if (id) emit("segment-click", id);
    } else if (tap && props.mode === "goto") {
        emit("point-selected", mapPoint(point));
    }
}

watch(() => [props.map.metaData.nonce, props.paletteMode, props.selectedSegmentIds.join("|")], renderLayers);
// Map data is markRaw and replaced wholesale, so a reference check is enough; editable entities are small and edited in place.
watch(() => props.map.entities, scheduleDraw);
watch(() => props.editableEntities, scheduleDraw, {deep: true});
watch(() => [props.zones, props.target, props.mode, props.editLine, props.coverage], scheduleDraw);
watch([aprilFools, activated, locale], scheduleDraw);
onMounted(() => {
    observer = new ResizeObserver(resize);
    observer.observe(canvas.value!);
    resize();
    renderLayers();
    // Labels are measured with web fonts; redraw once they are available.
    void document.fonts?.ready.then(scheduleDraw);
});
onBeforeUnmount(() => {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    layers.dispose();
});
</script>

<template>
    <canvas ref="canvas" class="h-full w-full touch-none" :aria-label='$t("Robot map; arrows pan, plus and minus zoom, zero fits")' tabindex="0"
        @wheel="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove"
        @pointerup="onPointerUp" @pointercancel="event => onPointerUp(event, true)" @keydown="onKeyDown" />
</template>
