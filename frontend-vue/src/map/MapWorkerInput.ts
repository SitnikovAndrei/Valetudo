import {toRaw} from "vue";
import type {RawMapData} from "../api/RawMapData";

export function prepareMapWorkerInput(map: RawMapData, selectedSegmentIds: string[]): {
    map: RawMapData;
    selectedSegmentIds: string[];
} {
    const rawMap = toRaw(map);
    return {
        map: {...rawMap, layers: toRaw(rawMap.layers).map(layer => toRaw(layer))},
        selectedSegmentIds: [...selectedSegmentIds]
    };
}
