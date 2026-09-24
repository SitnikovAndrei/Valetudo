import {describe, expect, it, vi} from "vitest";

vi.stubGlobal("localStorage", {getItem: () => null, setItem: vi.fn()});
const {formatSeconds, formatStatisticsValue, formatDateTime} = await import("./statistics");

describe("statistics formatting", () => {
    it("uses localized duration units instead of h/m/s", () => {
        expect(formatSeconds(7350, "ru")).toBe("2 ч 2 мин");
        expect(formatSeconds(7350, "en")).toBe("2 hr 2 min");
        expect(formatSeconds(95, "ru")).toBe("1 мин 35 с");
        expect(formatSeconds(-5, "ru")).toBe("0 с");
    });

    it("formats area and counts with the language's number format", () => {
        expect(formatStatisticsValue({type: "area", value: 345000}, "ru")).toBe("34,5 м²");
        expect(formatStatisticsValue({type: "area", value: 345000}, "en")).toBe("34.5 m²");
        expect(formatStatisticsValue({type: "count", value: 12345}, "en")).toBe("12,345");
    });

    it("prints dates with a 24-hour clock", () => {
        expect(formatDateTime("2026-01-01T22:05:00", "en")).toContain("22:05");
        expect(formatDateTime("2026-01-01T22:05:00", "ru")).toContain("22:05");
    });
});
