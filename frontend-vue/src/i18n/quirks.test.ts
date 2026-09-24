import {createRequire} from "node:module";
import {describe, expect, it} from "vitest";
import {ru} from "./ru";

const require = createRequire(import.meta.url);
const factories = ["dreame/DreameQuirkFactory", "midea/MideaQuirkFactory", "roborock/RoborockQuirkFactory", "viomi/ViomiQuirkFactory"];
type QuirkText = {title: string; description: string; options: string[]};
type QuirkFactory = {
    new(options: {robot: object}): {getQuirk(id: string): QuirkText};
    KNOWN_QUIRKS: Record<string, string>;
};

describe("quirk translations", () => {
    it("covers the titles, descriptions and options served by every robot factory", () => {
        for (const path of factories) {
            const Factory = require(`../../../backend/lib/robots/${path}`) as QuirkFactory;
            const factory = new Factory({robot: {}});
            for (const id of Object.values(Factory.KNOWN_QUIRKS)) {
                const quirk = factory.getQuirk(id);
                for (const text of [quirk.title, quirk.description, ...quirk.options]) {
                    expect(Object.prototype.hasOwnProperty.call(ru, text), `${path}: ${text}`).toBe(true);
                }
            }
        }
    });
});
