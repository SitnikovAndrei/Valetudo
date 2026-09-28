import {describe, expect, it} from "vitest";
import {quirkKind} from "./quirkKind";

describe("quirkKind", () => {
    it.each([
        ["on", "off"],
        ["off", "on"],
        ["Missing detergent cartridge", "off", "on"],
        ["on", "off", "a", "b", "c"]
    ])("recognizes on/off toggles including status values: %j", (...options) => {
        expect(quirkKind(options)).toBe("toggle");
    });

    it.each([
        ["select_to_trigger", "trigger"],
        ["trigger", "select_to_trigger"]
    ])("recognizes actions in either order: %j", (...options) => {
        expect(quirkKind(options)).toBe("action");
    });

    it.each([
        ["low", "high"],
        ["low", "medium", "high"],
        ["a", "b", "c", "d"],
        ["select_to_trigger", "trigger", "other"],
        ["on", "other"]
    ])("uses segments for ordinary short choices: %j", (...options) => {
        expect(quirkKind(options)).toBe("segmented");
    });

    it.each([[], ["only"], ["a", "b", "c", "d", "e"]])("uses a select outside the segment range: %j", (...options) => {
        expect(quirkKind(options)).toBe("select");
    });
});
