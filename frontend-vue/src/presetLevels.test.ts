import {describe, expect, it} from "vitest";
import {presetLevels} from "./presetLevels";

describe("presetLevels", () => {
    it("excludes off and numbers only supported levels in canonical order without mutation", () => {
        const options = ["turbo", "off", "medium", "low"];
        expect(presetLevels(options)).toEqual([
            {value: "off", level: 0, levels: 3},
            {value: "low", level: 1, levels: 3},
            {value: "medium", level: 2, levels: 3},
            {value: "turbo", level: 3, levels: 3}
        ]);
        expect(options).toEqual(["turbo", "off", "medium", "low"]);
    });

    it("handles empty, off-only and single-level capabilities", () => {
        expect(presetLevels([])).toEqual([]);
        expect(presetLevels(["off"])).toEqual([{value: "off", level: 0, levels: 0}]);
        expect(presetLevels(["high"])).toEqual([{value: "high", level: 1, levels: 1}]);
    });

    it("supports all six levels and preserves API order for noncanonical values", () => {
        expect(presetLevels(["off", "min", "low", "medium", "high", "max", "turbo"]).map(option => option.level)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(presetLevels(["off", "gentle", "strong"])).toEqual([
            {value: "off", level: 0, levels: 2},
            {value: "gentle", level: 1, levels: 2},
            {value: "strong", level: 2, levels: 2}
        ]);
    });
});
