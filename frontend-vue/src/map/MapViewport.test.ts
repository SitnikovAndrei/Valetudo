import {describe, expect, it} from "vitest";
import type {RawMapData} from "../api/RawMapData";
import {MapViewport} from "./MapViewport";

const map = {
    size: {x: 1000, y: 1000},
    pixelSize: 10,
    layers: [{dimensions: {x: {min: 10, max: 90}, y: {min: 20, max: 80}}}]
} as RawMapData;

describe("map viewport", () => {
    it("keeps the map point under the zoom anchor", () => {
        const viewport = new MapViewport();
        viewport.resize(800, 600, 2, map);
        const anchor = {x: 250, y: 180};
        const before = viewport.toWorldPoint(anchor);
        viewport.zoom(1.5, anchor);
        expect(viewport.toWorldPoint(anchor).x).toBeCloseTo(before.x);
        expect(viewport.toWorldPoint(anchor).y).toBeCloseTo(before.y);
    });

    it("preserves the center when the canvas resizes", () => {
        const viewport = new MapViewport();
        viewport.resize(800, 600, 2, map);
        const before = viewport.toWorldPoint({x: 200, y: 150});
        viewport.resize(1200, 900, 2, map);
        expect(viewport.toWorldPoint({x: 300, y: 225}).x).toBeCloseTo(before.x);
        expect(viewport.toWorldPoint({x: 300, y: 225}).y).toBeCloseTo(before.y);
    });

    it("clamps selection coordinates but allows zoom around the empty area", () => {
        const viewport = new MapViewport();
        viewport.resize(800, 600, 2, map);
        const anchor = {x: -100, y: -100};
        const before = viewport.toWorldPoint(anchor);
        expect(viewport.toMapPoint(anchor, map)).toEqual({x: 0, y: 0});
        viewport.zoom(2, anchor);
        expect(viewport.toWorldPoint(anchor).x).toBeCloseTo(before.x);
    });
});
