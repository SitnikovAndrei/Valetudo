import {describe, expect, it} from "vitest";
import {RawMapLayerType, type RawMapData, type RawMapLayer} from "../../../frontend/src/api/RawMapData";
import {getSegmentAtPoint} from "../../../frontend/src/map/SegmentLookup";
import {getSegmentLabelAtPoint, getSegmentLabelPoint} from "./SegmentLabelHitTest";
import {MapViewport} from "./MapViewport";

const lookup = {
    data: new Uint8ClampedArray([1, 2, 1, 2]),
    width: 2,
    height: 2,
    left: 10,
    top: 20,
    idMapping: {1: "left", 2: "right"}
};

const label = {
    type: RawMapLayerType.Segment,
    metaData: {segmentId: "left", name: "Kitchen"},
    dimensions: {x: {min: 10, max: 11, avg: 10.5}, y: {min: 20, max: 21, avg: 20.5}},
    pixels: [10, 20]
} as RawMapLayer;

describe("segment selection", () => {
    it("uses the pixel that is drawn under the pointer, including at boundaries", () => {
        expect(getSegmentAtPoint(lookup, 10.99, 20.5)).toBe("left");
        expect(getSegmentAtPoint(lookup, 11, 20.5)).toBe("right");
        expect(getSegmentAtPoint(lookup, 11.99, 21.99)).toBe("right");
        expect(getSegmentAtPoint(lookup, 12, 20.5)).toBeNull();
        expect(getSegmentAtPoint(lookup, 10, 22)).toBeNull();
        expect(getSegmentAtPoint(lookup, -1, 20)).toBeNull();
    });

    it("selects a visible room label before the segment underneath it", () => {
        const point = {x: 11.1, y: 20.5};
        expect(getSegmentAtPoint(lookup, point.x, point.y)).toBe("right");
        expect(getSegmentLabelAtPoint([label], point, () => 20)).toBe("left");
        expect(getSegmentLabelAtPoint([label], {x: 30, y: 30}, () => 20)).toBeNull();
    });

    it("keeps the room marker on its own pixels when the average is in another room", () => {
        const concave = {
            ...label,
            dimensions: {x: {avg: 11}, y: {avg: 20}},
            pixels: [10, 20, 12, 20]
        } as RawMapLayer;
        const marker = getSegmentLabelPoint(concave);
        expect(marker).toEqual({x: 10.5, y: 20.5});
        expect(getSegmentAtPoint(lookup, marker.x, marker.y)).toBe("left");
    });

    it("finds the same room after panning and zooming the HiDPI canvas", () => {
        const map = {size: {x: 100, y: 100}, pixelSize: 1, layers: [label]} as RawMapData;
        const viewport = new MapViewport();
        viewport.resize(400, 300, 2, map);
        viewport.pan({x: 40, y: -20});
        viewport.zoom(1.8, {x: 100, y: 80});
        const world = {x: 11.25, y: 20.5};
        const canvasPoint = viewport.toCanvasPoint(world);
        const screenPoint = {x: canvasPoint.x / viewport.dpr, y: canvasPoint.y / viewport.dpr};
        const hit = viewport.toWorldPoint(screenPoint);
        expect(getSegmentAtPoint(lookup, hit.x, hit.y)).toBe("right");
    });
});
