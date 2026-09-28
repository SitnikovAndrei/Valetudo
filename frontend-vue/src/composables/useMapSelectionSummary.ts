import {computed} from "vue";
import type {MapCleaning} from "./useMapCleaning";
import {translate} from "../i18n";

export function useMapSelectionSummary(cleaning: MapCleaning) {
    return computed(() => {
        switch (cleaning.mode.value) {
            case "all": return {title: translate("Whole home cleanup"), hint: translate("Regular full cleanup.")};
            case "segments": return {title: translate("Rooms"), hint: cleaning.selectedSegmentIds.value.length ? translate("Selected rooms: {count}", {count: cleaning.selectedSegmentIds.value.length}) : translate("Tap rooms to select them.")};
            case "zones": return {title: translate("Zone"), hint: cleaning.zones.value.length ? translate("Selected zones: {count}", {count: cleaning.zones.value.length}) : translate("Drag on the map to select an area.")};
            default: return {title: translate("Go to point"), hint: cleaning.target.value ? translate("Destination selected.") : translate("Tap the destination on the map.")};
        }
    });
}
