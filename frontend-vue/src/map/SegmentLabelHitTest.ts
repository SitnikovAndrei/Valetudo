import {RawMapLayerType, type RawMapLayer} from "../api/RawMapData";
import type {Point} from "./MapViewport";

/** Room label pill geometry in CSS pixels, shared by the renderer and the hit test. */
export const SEGMENT_LABEL = {
    font: "700 11px Manrope, sans-serif",
    height: 26,
    minWidth: 28,
    maxWidth: 92,
    padding: 17
} as const;

export function segmentLabelWidth(textWidth: number): number {
    return Math.max(SEGMENT_LABEL.minWidth, Math.min(SEGMENT_LABEL.maxWidth, textWidth + SEGMENT_LABEL.padding));
}

const labelPositions = new WeakMap<RawMapLayer, Point>();

export function getSegmentLabelPoint(layer: RawMapLayer): Point {
    const cached = labelPositions.get(layer);
    if (cached) return cached;

    const average = {x: layer.dimensions.x.avg, y: layer.dimensions.y.avg};
    let point = average;
    let nearestDistance = Infinity;
    for (let index = 0; index < layer.pixels.length; index += 2) {
        const x = layer.pixels[index] + 0.5;
        const y = layer.pixels[index + 1] + 0.5;
        const distance = (x - average.x) ** 2 + (y - average.y) ** 2;
        if (distance < nearestDistance) {
            nearestDistance = distance;
            point = {x, y};
        }
    }
    labelPositions.set(layer, point);
    return point;
}

export function segmentLabelText(layer: RawMapLayer): string {
    return layer.metaData.name || layer.metaData.segmentId || "";
}

/**
 * Returns the segment whose label pill contains the pointer.
 * @param screenPoint - pointer position in CSS pixels relative to the canvas
 * @param toScreen - converts a map point to CSS pixels relative to the canvas
 * @param measureText - text width in CSS pixels, measured with SEGMENT_LABEL.font
 */
export function getSegmentLabelAtScreenPoint(
    layers: RawMapLayer[],
    screenPoint: Point,
    toScreen: (point: Point) => Point,
    measureText: (label: string) => number
): string | null {
    for (let index = layers.length - 1; index >= 0; index--) {
        const layer = layers[index];
        const id = layer.metaData.segmentId;
        if (layer.type !== RawMapLayerType.Segment || !id) continue;

        const center = toScreen(getSegmentLabelPoint(layer));
        const halfWidth = segmentLabelWidth(measureText(segmentLabelText(layer))) / 2;
        if (Math.abs(screenPoint.x - center.x) <= halfWidth && Math.abs(screenPoint.y - center.y) <= SEGMENT_LABEL.height / 2) return id;
    }
    return null;
}
