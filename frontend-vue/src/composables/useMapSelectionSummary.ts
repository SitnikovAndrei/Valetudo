import {computed} from "vue";
import type {MapCleaning} from "./useMapCleaning";
import {translate} from "../i18n";

export function useMapSelectionSummary(cleaning: MapCleaning, phone = false) {
    return computed(() => {
        switch (cleaning.mode.value) {
            case "all": return {title: translate("Whole home cleanup"), hint: translate("Regular full cleanup.")};
            case "segments": return {title: translate("Rooms"), hint: cleaning.selectedSegmentIds.value.length ? translate("Selected rooms: {count}", {count: cleaning.selectedSegmentIds.value.length}) : translate("Tap rooms to select them.")};
            case "zones": return {title: translate("Zone"), hint: cleaning.zones.value.length ? translate("Selected zones: {count}", {count: cleaning.zones.value.length}) : translate(phone ? "Draw a zone with one finger, move the map with two fingers or the hand button." : "Drag on the map to select an area. Use the hand button or right mouse button to move the map.")};
            default: return {title: translate("Go to point"), hint: cleaning.target.value ? translate("Destination selected.") : translate(phone ? "Tap a destination. Move the map with two fingers or the hand button." : "Tap a destination. Use the hand button or right mouse button to move the map.")};
        }
    });
}
