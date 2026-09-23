import {beforeEach, describe, expect, it, vi} from "vitest";

beforeEach(() => {
    vi.resetModules();
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value)
    });
});

describe("UI language", () => {
    it("starts in Russian and switches without reload", async () => {
        const {i18n, setLanguage, translate} = await import("./index");
        expect(i18n.global.locale.value).toBe("ru");
        expect(translate("Unable to connect to Valetudo.")).toBe("Не удалось подключиться к Valetudo.");
        setLanguage("en");
        expect(translate("Unable to connect to Valetudo.")).toBe("Unable to connect to Valetudo.");
        expect(localStorage.getItem("ui-language")).toBe("en");
    });

    it("restores a saved English choice", async () => {
        localStorage.setItem("ui-language", "en");
        const {i18n, translate} = await import("./index");
        expect(i18n.global.locale.value).toBe("en");
        expect(translate("The {name} consumable is depleted.", {name: "filter"})).toBe("The filter consumable is depleted.");
    });

    it("ignores an unsupported stored language", async () => {
        localStorage.setItem("ui-language", "de");
        const {i18n} = await import("./index");
        expect(i18n.global.locale.value).toBe("ru");
    });
});
