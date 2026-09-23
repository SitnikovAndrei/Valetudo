import {beforeEach, describe, expect, it, vi} from "vitest";
import {computed} from "vue";

beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", {getItem: () => null, setItem: vi.fn()});
});

describe("robot option labels", () => {
    it("translates known Select values when the language changes", async () => {
        const {setLanguage} = await import("./index");
        const {valueLabel} = await import("./labels");
        const option = {value: "every_10_m2"};
        const label = computed(() => valueLabel(option.value));

        expect(label.value).toBe("каждые 10 м²");
        expect(option.value).toBe("every_10_m2");
        setLanguage("en");
        expect(label.value).toBe("every_10_m2");
        setLanguage("ru");
        expect(label.value).toBe("каждые 10 м²");
        expect(valueLabel("unknown_robot_value")).toBe("unknown_robot_value");
    });

    it("translates consumable names as complete phrases", async () => {
        const {setLanguage} = await import("./index");
        const {consumableName} = await import("./labels");

        expect(consumableName("brush", "main")).toBe("Основная щётка");
        expect(consumableName("brush", "side_right")).toBe("Правая боковая щётка");
        expect(consumableName("cleaning", "sensor")).toBe("Очистка датчиков");
        setLanguage("en");
        expect(consumableName("brush", "main")).toBe("Main brush");
    });
});
