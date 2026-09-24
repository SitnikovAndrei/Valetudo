import {RawMapLayerType, type RawMapLayer} from "../api/RawMapData";
import type {Point} from "./MapViewport";

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

export function getSegmentLabelAtPoint(layers: RawMapLayer[], point: Point, measureLabel: (label: string) => number): string | null {
    for (let index = layers.length - 1; index >= 0; index--) {
        const layer = layers[index];
        const id = layer.metaData.segmentId;
        if (layer.type !== RawMapLayerType.Segment || !id) continue;

        const labelPoint = getSegmentLabelPoint(layer);
        const dx = point.x - labelPoint.x;
        const dy = point.y - labelPoint.y;
        if (dx * dx + dy * dy <= 7 * 7) return id;

        const label = layer.metaData.name || id;
        if (Math.abs(dx) <= Math.min(measureLabel(label), 40) / 2 && Math.abs(dy - 7) <= 3) return id;
    }
    return null;
}
