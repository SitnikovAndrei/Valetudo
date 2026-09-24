<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Message from "primevue/message";
import {Capability, type Zone} from "../api/types";
import type {StatusState} from "../api/RawRobotState";
import {
    fetchMapSegmentationProperties, fetchStateAttributes, fetchZoneProperties,
    sendCleanSegmentsCommand, sendCleanZonesCommand, sendGoToCommand
} from "../api/client";
import {useRobotMap} from "../composables/useRobotMap";
import MapCanvas from "./MapCanvas.vue";
import HomeCommandIcon from "./HomeCommandIcon.vue";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";

type Point = {x: number; y: number};
type MapZone = {a: Point; b: Point};
type Mode = "all" | "segments" | "zones" | "goto";
const props = defineProps<{
    capabilities: Capability[];
    paletteMode: "light" | "dark";
    status?: StatusState;
}>();
const emit = defineEmits<{"pending-change": [pending: boolean]}>();
const queryClient = useQueryClient();
const map = useRobotMap();
const mapCanvas = ref<InstanceType<typeof MapCanvas>>();
const mapExpanded = ref(false);
const modes = computed<Mode[]>(() => [
    "all",
    ...(props.capabilities.includes(Capability.MapSegmentation) ? ["segments" as const] : []),
    ...(props.capabilities.includes(Capability.ZoneCleaning) ? ["zones" as const] : []),
    ...(props.capabilities.includes(Capability.GoToLocation) ? ["goto" as const] : [])
]);
const savedMode = localStorage.getItem("live-map-mode");
const mode = ref<Mode>(modes.value.includes(savedMode as Mode) ? savedMode as Mode : "all");
const requestedMode = ref<Mode>();
const selectedSegmentIds = ref<string[]>([]);
const zones = ref<MapZone[]>([]);
const target = ref<Point>();
const pointX = ref(0);
const pointY = ref(0);
const zoneX1 = ref(0);
const zoneY1 = ref(0);
const zoneX2 = ref(0);
const zoneY2 = ref(0);
const iterations = ref(1);
const pending = computed(() => selectedSegmentIds.value.length > 0 || zones.value.length > 0 || !!target.value);
const canAct = computed(() => ["idle", "docked", "paused", "returning", "error"].includes(props.status?.value ?? ""));
const mapActionLabel = computed(() => mode.value === "goto" ? translate("Go to point") : mode.value === "segments" ? translate("Clean {count} rooms", {count: selectedSegmentIds.value.length}) : translate("Clean {count} zones", {count: zones.value.length}));
const mapActionDisabled = computed(() => !pending.value || !canAct.value || action.isPending.value || (mode.value === "zones" && (zoneProperties.isPending.value || zoneProperties.isError.value || zones.value.length < (zoneProperties.data.value?.zoneCount.min ?? 1))) || (mode.value === "segments" && (segmentation.isPending.value || segmentation.isError.value)));
const segmentation = useQuery({
    queryKey: ["mapSegmentationProperties"],
    queryFn: fetchMapSegmentationProperties,
    enabled: computed(() => props.capabilities.includes(Capability.MapSegmentation))
});
const zoneProperties = useQuery({
    queryKey: ["zoneProperties"],
    queryFn: fetchZoneProperties,
    enabled: computed(() => props.capabilities.includes(Capability.ZoneCleaning))
});
const maxIterations = computed(() => mode.value === "segments"
    ? segmentation.data.value?.iterationCount.max ?? 1
    : zoneProperties.data.value?.iterationCount.max ?? 1);
const minIterations = computed(() => mode.value === "segments"
    ? segmentation.data.value?.iterationCount.min ?? 1
    : zoneProperties.data.value?.iterationCount.min ?? 1);
const maxX = computed(() => map.data.value?.size.x ?? 0);
const maxY = computed(() => map.data.value?.size.y ?? 0);
const action = useMutation({
    mutationFn: async () => {
        if (!map.data.value) throw new Error(translate("No map data"));
        if (mode.value === "segments" && selectedSegmentIds.value.length) {
            await sendCleanSegmentsCommand({
                segment_ids: selectedSegmentIds.value,
                iterations: iterations.value,
                customOrder: segmentation.data.value?.customOrderSupport ?? false
            });
        } else if (mode.value === "zones" && zones.value.length) {
            const unit = map.data.value.pixelSize;
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
            await sendGoToCommand({
                x: Math.floor(target.value.x * map.data.value.pixelSize),
                y: Math.floor(target.value.y * map.data.value.pixelSize)
            });
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

watch(pending, value => emit("pending-change", value), {immediate: true});
watch(modes, available => {
    if (!available.includes(mode.value)) setMode(available[0]);
});
watch([map.isPending, map.data], ([loading, data]) => {
    if (!loading && !data && mode.value !== "all") changeMode("all");
}, {immediate: true});
watch([minIterations, maxIterations], () => {
    iterations.value = Math.max(minIterations.value, Math.min(maxIterations.value, iterations.value));
});
watch(mapExpanded, async expanded => {
    document.body.classList.toggle("home-map-expanded", expanded);
    await nextTick();
    window.requestAnimationFrame(() => mapCanvas.value?.fitMap());
});
onBeforeUnmount(() => document.body.classList.remove("home-map-expanded"));

function clear() {
    selectedSegmentIds.value = [];
    zones.value = [];
    target.value = undefined;
}

function setMode(next: Mode) {
    if (!modes.value.includes(next)) return;
    if (next === mode.value) return;
    if (pending.value) {requestedMode.value = next; return;}
    changeMode(next);
}

function changeMode(next: Mode) {
    clear();
    mode.value = next;
    iterations.value = 1;
    localStorage.setItem("live-map-mode", next);
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
    if (zones.value.length >= (zoneProperties.data.value?.zoneCount.max ?? Infinity)) return;
    zones.value = [...zones.value, zone];
}

function selectPoint(point: Point) {
    if (!map.data.value) return;
    pointX.value = Math.round(point.x * map.data.value.pixelSize);
    pointY.value = Math.round(point.y * map.data.value.pixelSize);
    target.value = point;
}

function setPointFromCoordinates() {
    if (!map.data.value) return;
    const unit = map.data.value.pixelSize;
    target.value = {x: Math.max(0, Math.min(maxX.value, pointX.value)) / unit, y: Math.max(0, Math.min(maxY.value, pointY.value)) / unit};
}

function addCoordinateZone() {
    if (!map.data.value || zoneX1.value === zoneX2.value || zoneY1.value === zoneY2.value) return;
    const unit = map.data.value.pixelSize;
    const clampX = (value: number) => Math.max(0, Math.min(maxX.value, value)) / unit;
    const clampY = (value: number) => Math.max(0, Math.min(maxY.value, value)) / unit;
    addZone({a: {x: clampX(Math.min(zoneX1.value, zoneX2.value)), y: clampY(Math.min(zoneY1.value, zoneY2.value))}, b: {x: clampX(Math.max(zoneX1.value, zoneX2.value)), y: clampY(Math.max(zoneY1.value, zoneY2.value))}});
}

function execute() {
    if (action.isPending.value || !canAct.value || !pending.value) return;
    if (mode.value === "segments" && (segmentation.isPending.value || segmentation.isError.value)) return;
    if (mode.value === "zones" && (zoneProperties.isPending.value || zoneProperties.isError.value)) return;
    if (mode.value === "zones" && zones.value.length < (zoneProperties.data.value?.zoneCount.min ?? 1)) return;
    action.mutate();
}
</script>

<template>
    <section class="home-dashboard">
        <div class="panel home-map" :class="{'home-map--expanded': mapExpanded}" @keydown.esc="mapExpanded = false">
            <div class="home-map-heading"><div><span class="page-header-kicker">{{ $t("Robot map") }}</span><h2>{{ $t("Floor plan") }}</h2></div><span v-if="map.data.value && modes.length > 1" class="home-map-capability">{{ $t("Rooms and zones available") }}</span><button v-if="map.data.value" class="home-map-expand" type="button" :aria-label="mapExpanded ? $t('Close') : $t('Fullscreen')" :title="mapExpanded ? $t('Close') : $t('Fullscreen')" :aria-pressed="mapExpanded" @click="mapExpanded = !mapExpanded"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-if="mapExpanded" d="M5 5 19 19M19 5 5 19" /><path v-else d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg></button></div>
            <div v-if="map.isPending.value" class="async-state" role="status">{{ $t("Loading map…") }}</div>
            <div v-else-if="map.isError.value" class="async-state"><Message severity="error">{{ $t("Unable to load map data.") }}</Message><Button :label='$t("Retry")' outlined @click="map.refetch()" /></div>
            <div v-else-if="!map.data.value" class="async-state">{{ $t("No map data reported.") }}</div>
            <div v-else class="home-map-viewport">
                <MapCanvas ref="mapCanvas" :map="map.data.value" :palette-mode="paletteMode" :mode="mode === 'all' ? 'pan' : mode"
                    :selected-segment-ids="selectedSegmentIds" :zones="zones" :target="target"
                    @segment-click="toggleSegment" @zone-created="addZone" @point-selected="selectPoint" />
                <div class="home-map-zoom" role="group" :aria-label='$t("Map zoom")'>
                    <button type="button" :aria-label='$t("Zoom in")' @click="mapCanvas?.zoomIn()">+</button>
                    <button type="button" :aria-label='$t("Zoom out")' @click="mapCanvas?.zoomOut()">−</button>
                    <button type="button" :aria-label='$t("Fit map")' @click="mapCanvas?.fitMap()">⌑</button>
                </div>
            </div>
            <div v-if="map.data.value" class="home-map-footer"><span v-for="layer in map.data.value.layers.filter(layer => layer.type === 'segment' && layer.metaData.segmentId).slice(0, 3)" :key="layer.metaData.segmentId">{{ layer.metaData.name || $t('Room {id}', {id: layer.metaData.segmentId}) }}</span><span class="home-map-footer-note">{{ $t("Live robot map") }}</span></div>
        </div>
        <div class="panel home-actions">
            <div class="home-action-status"><slot name="action-status" /></div>
            <p class="page-header-kicker">{{ $t("Cleaning controls") }}</p>
            <h2 class="text-lg font-bold"><span class="home-desktop-title">{{ $t("Where to clean?") }}</span><span class="home-mobile-title">{{ $t("Cleaning") }}</span></h2>
            <p class="home-action-help">{{ $t("Available actions depend on the robot and its state.") }}</p>
            <div class="home-mode-grid" role="group" :aria-label='$t("Cleaning area")'>
                <button v-for="option in modes" :key="option" type="button" :aria-pressed="mode === option" :disabled="option !== 'all' && !map.data.value" @click="setMode(option)"><span aria-hidden="true">{{ option === 'all' ? '▦' : option === 'segments' ? '▣' : option === 'zones' ? '◌' : '⌖' }}</span>{{ option === 'all' ? $t('Whole home') : option === 'segments' ? $t('Rooms') : option === 'zones' ? $t('Zone') : $t('To point') }}</button>
            </div>
            <div class="home-selection-panel">
                <strong>{{ mode === 'all' ? $t('Whole home cleanup') : mode === 'segments' ? $t('Rooms') : mode === 'zones' ? $t('Zone') : $t('Go to point') }}</strong>
                <small v-if="mode === 'all'">{{ $t("Regular full cleanup.") }}</small>
                <small v-else-if="mode === 'segments'">{{ selectedSegmentIds.length ? $t('Selected rooms: {count}', {count: selectedSegmentIds.length}) : $t('Tap rooms to select them.') }}</small>
                <small v-else-if="mode === 'zones'">{{ zones.length ? $t('Selected zones: {count}', {count: zones.length}) : $t('Drag on the map to select an area.') }}</small>
                <small v-else>{{ target ? $t('Destination selected.') : $t('Tap the destination on the map.') }}</small>
            </div>
            <template v-if="map.data.value && mode === 'segments'">
                <div class="mb-3 flex flex-wrap gap-2" role="group" :aria-label='$t("Select rooms")'>
                    <Button v-for="layer in map.data.value.layers.filter(layer => layer.type === 'segment' && layer.metaData.segmentId)" :key="layer.metaData.segmentId" :label="layer.metaData.name || layer.metaData.segmentId" size="small" :outlined="!selectedSegmentIds.includes(layer.metaData.segmentId!)" @click="toggleSegment(layer.metaData.segmentId!)" />
                </div>
            </template>
            <details v-if="map.data.value && mode === 'goto'" class="home-coordinate-details"><summary>{{ $t("Enter coordinates") }}</summary><div class="mt-2 flex flex-wrap items-end gap-2" role="group" :aria-label='$t("Point coordinates")'>
                <label class="flex flex-col gap-1 text-xs">{{ $t("X (cm)") }}<InputNumber v-model="pointX" :min="0" :max="maxX" :use-grouping="false" input-class="w-20" /></label>
                <label class="flex flex-col gap-1 text-xs">{{ $t("Y (cm)") }}<InputNumber v-model="pointY" :min="0" :max="maxY" :use-grouping="false" input-class="w-20" /></label>
                <Button :label='$t("Set point")' outlined size="small" @click="setPointFromCoordinates" />
            </div></details>
            <details v-if="map.data.value && mode === 'zones'" class="home-coordinate-details"><summary>{{ $t("Enter coordinates") }}</summary><div class="mt-2 flex flex-wrap items-end gap-2" role="group" :aria-label='$t("Zone coordinates")'>
                <label v-for="axis in ['X1', 'Y1', 'X2', 'Y2']" :key="axis" class="flex flex-col gap-1 text-xs">{{ axis }} ({{ $t("cm") }})<InputNumber v-if="axis === 'X1'" v-model="zoneX1" :min="0" :max="maxX" :use-grouping="false" input-class="w-16" /><InputNumber v-else-if="axis === 'Y1'" v-model="zoneY1" :min="0" :max="maxY" :use-grouping="false" input-class="w-16" /><InputNumber v-else-if="axis === 'X2'" v-model="zoneX2" :min="0" :max="maxX" :use-grouping="false" input-class="w-16" /><InputNumber v-else v-model="zoneY2" :min="0" :max="maxY" :use-grouping="false" input-class="w-16" /></label>
                <Button :label='$t("Add zone")' size="small" outlined :disabled="zoneX1 === zoneX2 || zoneY1 === zoneY2 || zones.length >= (zoneProperties.data.value?.zoneCount.max ?? 1)" @click="addCoordinateZone" />
            </div></details>
            <div v-if="(mode === 'segments' || mode === 'zones') && maxIterations > 1" class="mb-3 flex items-center gap-2"><label for="map-iterations">{{ $t("Passes") }}</label><InputNumber v-model="iterations" input-id="map-iterations" :min="minIterations" :max="maxIterations" show-buttons button-layout="horizontal" class="w-36" input-class="!w-16 !min-w-0" /></div>
            <Button v-if="pending" :label='$t("Clear selection")' size="small" text class="mb-2" @click="clear" />
            <div class="home-command-stack">
                <Button v-if="mode !== 'all'" :label="mapActionLabel" :disabled="mapActionDisabled" :loading="action.isPending.value" @click="execute"><template #icon><HomeCommandIcon action="start" /></template></Button>
                <slot name="actions" :mode="mode" />
            </div>
            <div class="home-action-presets"><slot name="presets" /></div>
            <Message v-if="action.isError.value" severity="error" class="mt-3">{{ $t("Map action failed. Check the robot state and retry.") }}</Message>
            <Message v-if="segmentation.isError.value && mode === 'segments'" severity="error" class="mt-3">{{ $t("Unable to load segment limits.") }}</Message>
            <Message v-if="zoneProperties.isError.value && mode === 'zones'" severity="error" class="mt-3">{{ $t("Unable to load zone limits.") }}</Message>
        </div>
        <RouterLink v-if="capabilities.includes(Capability.DoNotDisturb)" class="home-quiet-card" to="/options"><span aria-hidden="true">☾</span><span><strong>{{ $t("Do not disturb") }}</strong><small>{{ $t("The behavior depends on the robot model.") }}</small></span><span aria-hidden="true">›</span></RouterLink>
        <div class="panel home-status"><slot name="status" /></div>
        <div class="home-mobile-command">
            <Button v-if="mode !== 'all'" :label="mapActionLabel" :disabled="mapActionDisabled" :loading="action.isPending.value" @click="execute"><template #icon><HomeCommandIcon action="start" /></template></Button>
            <slot name="mobile-actions" :mode="mode" />
        </div>
        <Dialog :visible="!!requestedMode" modal :header='$t("Change cleaning area?")' class="max-w-md" @update:visible="value => {if (!value) requestedMode = undefined;}">
            <p>{{ $t("The current map selection will be cleared.") }}</p>
            <div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="requestedMode = undefined" /><Button :label='$t("Change area")' @click="confirmModeChange" /></div>
        </Dialog>
    </section>
</template>
