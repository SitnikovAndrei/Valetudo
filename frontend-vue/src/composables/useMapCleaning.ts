import {computed, ref, watch, type Ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import {Capability, type Zone} from "../api/types";
import {RawMapLayerType, type RawMapData} from "../api/RawMapData";
import type {StatusState} from "../api/RawRobotState";
import {fetchMapSegmentationProperties, fetchStateAttributes, fetchZoneProperties, sendCleanSegmentsCommand, sendCleanZonesCommand, sendGoToCommand} from "../api/client";
import {translate} from "../i18n";

export type Point = {x: number; y: number};
export type MapZone = {a: Point; b: Point};
export type CleaningMode = "all" | "segments" | "zones" | "goto";

const modeStorageKey = "live-map-mode";
const actionableStates: StatusState["value"][] = ["idle", "docked", "paused", "returning", "error"];

function readStoredMode(): string | null {
    try {
        return localStorage.getItem(modeStorageKey);
    } catch {
        return null;
    }
}

/**
 * State and commands for map-based cleaning on the home page: the selected area mode, the rooms,
 * zones or target picked on the map, the pass count and the mutation that sends the command.
 */
export function useMapCleaning(options: {
    capabilities: () => Capability[];
    map: Ref<RawMapData | null | undefined>;
    mapLoading: Ref<boolean>;
    status: () => StatusState | undefined;
}) {
    const queryClient = useQueryClient();
    const has = (capability: Capability) => options.capabilities().includes(capability);

    const modes = computed<CleaningMode[]>(() => [
        "all",
        ...(has(Capability.MapSegmentation) ? ["segments" as const] : []),
        ...(has(Capability.ZoneCleaning) ? ["zones" as const] : []),
        ...(has(Capability.GoToLocation) ? ["goto" as const] : [])
    ]);
    const saved = readStoredMode();
    const mode = ref<CleaningMode>(modes.value.includes(saved as CleaningMode) ? saved as CleaningMode : "all");
    const requestedMode = ref<CleaningMode>();

    const selectedSegmentIds = ref<string[]>([]);
    const zones = ref<MapZone[]>([]);
    const target = ref<Point>();
    const iterations = ref(1);

    const segmentation = useQuery({queryKey: ["mapSegmentationProperties"], queryFn: fetchMapSegmentationProperties, enabled: computed(() => has(Capability.MapSegmentation))});
    const zoneProperties = useQuery({queryKey: ["zoneProperties"], queryFn: fetchZoneProperties, enabled: computed(() => has(Capability.ZoneCleaning))});

    const segments = computed(() => (options.map.value?.layers ?? [])
        .filter(layer => layer.type === RawMapLayerType.Segment && layer.metaData.segmentId)
        .map(layer => ({id: layer.metaData.segmentId!, name: layer.metaData.name || layer.metaData.segmentId!})));
    const zoneLimits = computed(() => ({min: zoneProperties.data.value?.zoneCount.min ?? 1, max: zoneProperties.data.value?.zoneCount.max ?? 1}));
    const iterationLimits = computed(() => {
        const limits = mode.value === "segments" ? segmentation.data.value?.iterationCount : zoneProperties.data.value?.iterationCount;
        return {min: limits?.min ?? 1, max: limits?.max ?? 1};
    });

    const pending = computed(() => selectedSegmentIds.value.length > 0 || zones.value.length > 0 || !!target.value);
    const canAct = computed(() => actionableStates.includes(options.status()?.value ?? "" as StatusState["value"]));
    const propertiesReady = computed(() => {
        if (mode.value === "segments") return !segmentation.isPending.value && !segmentation.isError.value;
        if (mode.value === "zones") return !zoneProperties.isPending.value && !zoneProperties.isError.value && zones.value.length >= zoneLimits.value.min;
        return true;
    });

    const action = useMutation({
        mutationFn: async () => {
            const map = options.map.value;
            if (!map) throw new Error(translate("No map data"));
            const unit = map.pixelSize;
            if (mode.value === "segments" && selectedSegmentIds.value.length) {
                await sendCleanSegmentsCommand({
                    segment_ids: selectedSegmentIds.value,
                    iterations: iterations.value,
                    customOrder: segmentation.data.value?.customOrderSupport ?? false
                });
            } else if (mode.value === "zones" && zones.value.length) {
                const apiZones: Zone[] = zones.value.map(zone => ({
                    points: {
                        pA: {x: zone.a.x * unit, y: zone.a.y * unit},
                        pB: {x: zone.b.x * unit, y: zone.a.y * unit},
                        pC: {x: zone.b.x * unit, y: zone.b.y * unit},
                        pD: {x: zone.a.x * unit, y: zone.b.y * unit}
                    }
                }));
                await sendCleanZonesCommand({zones: apiZones, iterations: iterations.value});
            } else if (mode.value === "goto" && target.value) {
                await sendGoToCommand({x: Math.floor(target.value.x * unit), y: Math.floor(target.value.y * unit)});
            } else {
                throw new Error(translate("No map action selected"));
            }
            return fetchStateAttributes();
        },
        onSuccess: attributes => {
            queryClient.setQueryData(["robotAttributes"], attributes);
            clear();
        }
    });

    const actionLabel = computed(() => {
        if (mode.value === "goto") return translate("Go to point");
        if (mode.value === "segments") return selectedSegmentIds.value.length ? translate("Clean {count} rooms", {count: selectedSegmentIds.value.length}) : translate("Select rooms");
        return zones.value.length ? translate("Clean {count} zones", {count: zones.value.length}) : translate("Select a zone");
    });
    const actionDisabled = computed(() => !pending.value || !canAct.value || action.isPending.value || !propertiesReady.value);

    function clear() {
        selectedSegmentIds.value = [];
        zones.value = [];
        target.value = undefined;
    }

    function changeMode(next: CleaningMode) {
        clear();
        mode.value = next;
        iterations.value = 1;
        try {
            localStorage.setItem(modeStorageKey, next);
        } catch {
            // Mode is still applied for this visit.
        }
    }

    /** Switching modes discards the current selection, so ask first if there is one. */
    function setMode(next: CleaningMode) {
        if (!modes.value.includes(next) || next === mode.value) return;
        if (pending.value) requestedMode.value = next;
        else changeMode(next);
    }

    function confirmModeChange() {
        if (requestedMode.value) changeMode(requestedMode.value);
        requestedMode.value = undefined;
    }

    function toggleSegment(id: string) {
        selectedSegmentIds.value = selectedSegmentIds.value.includes(id)
            ? selectedSegmentIds.value.filter(selected => selected !== id)
            : [...selectedSegmentIds.value, id];
    }

    function addZone(zone: MapZone) {
        if (zones.value.length >= zoneLimits.value.max) return;
        zones.value = [...zones.value, zone];
    }

    function removeZone(index: number) {
        zones.value = zones.value.filter((_, zoneIndex) => zoneIndex !== index);
    }

    function selectPoint(point: Point) {
        target.value = point;
    }

    function execute() {
        if (!actionDisabled.value) action.mutate();
    }

    watch(modes, available => {
        if (!available.includes(mode.value)) changeMode(available[0]);
    });
    watch([options.mapLoading, options.map], ([loading, data]) => {
        if (!loading && !data && mode.value !== "all") changeMode("all");
    }, {immediate: true});
    watch(iterationLimits, ({min, max}) => {
        iterations.value = Math.max(min, Math.min(max, iterations.value));
    });

    return {
        modes, mode, requestedMode, setMode, confirmModeChange,
        segments, selectedSegmentIds, toggleSegment,
        zones, zoneLimits, addZone, removeZone,
        target, selectPoint,
        iterations, iterationLimits,
        pending, clear,
        segmentation, zoneProperties,
        action, actionLabel, actionDisabled, execute
    };
}

export type MapCleaning = ReturnType<typeof useMapCleaning>;
