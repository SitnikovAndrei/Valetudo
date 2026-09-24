import {describe, expect, it} from "vitest";
import {formatMinutes} from "./formatDuration";

describe("consumable remaining time", () => {
    it("splits minutes into days, hours and minutes with Russian forms", () => {
        expect(formatMinutes(0, "ru")).toBe("0 минут");
        expect(formatMinutes(60, "ru")).toBe("1 час 0 минут");
        expect(formatMinutes(1501, "ru")).toBe("1 день 1 час 1 минута");
        expect(formatMinutes(2882, "ru")).toBe("2 дня 0 часов 2 минуты");
    });

    it("uses the selected language and ignores invalid negative values", () => {
        expect(formatMinutes(1501, "en")).toBe("1 day 1 hour 1 minute");
        expect(formatMinutes(-12, "ru")).toBe("0 минут");
    });
});
