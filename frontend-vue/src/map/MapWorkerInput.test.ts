import {describe, expect, it} from "vitest";
import {reactive} from "vue";
import {RawMapLayerType, type RawMapData} from "../api/RawMapData";
import {prepareMapWorkerInput} from "./MapWorkerInput";

describe("map worker input", () => {
    it("removes Vue proxies before structured cloning map layers and selection", () => {
        const rawMap = {
            metaData: {version: 2, nonce: "map-1"},
            size: {x: 100, y: 100},
            pixelSize: 5,
            layers: [{
                type: RawMapLayerType.Segment,
                metaData: {area: 25, segmentId: "1"},
                pixels: [1, 2],
                dimensions: {
                    x: {min: 1, max: 1, mid: 1, avg: 1},
                    y: {min: 2, max: 2, mid: 2, avg: 2},
                    pixelCount: 1
                }
            }],
            entities: []
        } satisfies RawMapData;
        const reactiveMap = reactive(rawMap);
        const composedMap = reactive({...reactiveMap, entities: []});
        const selection = reactive(["1"]);

        expect(() => structuredClone({layers: composedMap.layers, selection})).toThrow();
        const input = prepareMapWorkerInput(composedMap, selection);
        expect(structuredClone({layers: input.map.layers, selection: input.selectedSegmentIds})).toEqual({
            layers: rawMap.layers,
            selection: ["1"]
        });
    });
});
