import {describe, expect, it} from "vitest";
import {MapGestures} from "./MapGestures";

describe("map gestures", () => {
    it("distinguishes a tap from a drag and a cancelled pointer", () => {
        const gestures = new MapGestures();
        gestures.startPointer(1, {x: 10, y: 10});
        expect(gestures.endPointer(1, {x: 12, y: 12})?.tap).toBe(true);
        gestures.startPointer(2, {x: 10, y: 10});
        expect(gestures.movePointer(2, {x: 30, y: 10})).toMatchObject({kind: "drag"});
        expect(gestures.endPointer(2, {x: 30, y: 10})?.tap).toBe(false);
        gestures.startPointer(3, {x: 10, y: 10});
        expect(gestures.endPointer(3, {x: 10, y: 10}, true)?.tap).toBe(false);
    });

    it("suppresses taps and shape previews after a pinch", () => {
        const gestures = new MapGestures();
        gestures.startPointer(1, {x: 10, y: 10});
        gestures.startPointer(2, {x: 30, y: 10});
        expect(gestures.preview).toBeUndefined();
        expect(gestures.movePointer(2, {x: 40, y: 10})).toMatchObject({
            kind: "pinch", factor: 1.5, center: {x: 25, y: 10}, pan: {x: 5, y: 0}
        });
        gestures.endPointer(2, {x: 40, y: 10});
        expect(gestures.movePointer(1, {x: 12, y: 10})).toMatchObject({kind: "drag", afterPinch: true});
        expect(gestures.preview).toBeUndefined();
        expect(gestures.endPointer(1, {x: 12, y: 10})?.tap).toBe(false);
    });
});
