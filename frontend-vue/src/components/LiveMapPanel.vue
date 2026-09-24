<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
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
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";

type Point = {x: number; y: number};
type MapZone = {a: Point; b: Point};
type Mode = "segments" | "zones" | "goto" | "pan";
const props = defineProps<{
    capabilities: Capability[];
    paletteMode: "light" | "dark";
    status?: StatusState;
}>();
const emit = defineEmits<{"pending-change": [pending: boolean]}>();
const queryClient = useQueryClient();
const map = useRobotMap();
const modes = computed<Mode[]>(() => [
    ...(props.capabilities.includes(Capability.MapSegmentation) ? ["segments" as const] : []),
    ...(props.capabilities.includes(Capability.ZoneCleaning) ? ["zones" as const] : []),
    ...(props.capabilities.includes(Capability.GoToLocation) ? ["goto" as const] : []),
    "pan"
]);
const savedMode = localStorage.getItem("live-map-mode");
const mode = ref<Mode>(modes.value.includes(savedMode as Mode) ? savedMode as Mode : modes.value[0]);
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
watch([minIterations, maxIterations], () => {
    iterations.value = Math.max(minIterations.value, Math.min(maxIterations.value, iterations.value));
});

function clear() {
    selectedSegmentIds.value = [];
    zones.value = [];
    target.value = undefined;
}

function setMode(next: Mode) {
    if (!modes.value.includes(next)) return;
    clear();
    mode.value = next;
    iterations.value = 1;
    localStorage.setItem("live-map-mode", next);
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
    <section class="panel flex min-h-[28rem] flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">{{ $t("Live map") }}</h2>
            <div v-if="map.data.value" class="flex flex-wrap gap-2" role="group" :aria-label='$t("Map interaction mode")'>
                <Button v-for="option in modes" :key="option" :label="valueLabel(option)"
                    :outlined="mode !== option" size="small" @click="setMode(option)" />
            </div>
        </div>
        <div v-if="map.isPending.value" role="status" class="flex flex-1 items-center justify-center">{{ $t("Loading map…") }}</div>
        <div v-else-if="map.isError.value" class="flex flex-1 flex-col items-center justify-center gap-3">
            <Message severity="error">{{ $t("Unable to load map data.") }}</Message>
            <Button :label='$t("Retry")' @click="map.refetch()" />
        </div>
        <p v-else-if="!map.data.value" class="muted">{{ $t("No map data reported.") }}</p>
        <template v-else>
            <div class="h-[28rem] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] md:h-[36rem]">
                <MapCanvas :map="map.data.value" :palette-mode="paletteMode" :mode="mode"
                    :selected-segment-ids="selectedSegmentIds" :zones="zones" :target="target"
                    @segment-click="toggleSegment" @zone-created="addZone" @point-selected="selectPoint" />
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <p v-if="mode === 'zones'" class="muted text-sm">{{ $t("Drag on the map to select an area.") }}</p>
                <p v-if="mode === 'goto'" class="muted text-sm">{{ $t("Tap the destination on the map.") }}</p>
                <div v-if="mode === 'goto'" class="flex flex-wrap items-end gap-2" role="group" :aria-label='$t("Point coordinates")'><label class="flex flex-col gap-1 text-sm">{{ $t("X (cm)") }}<InputNumber v-model="pointX" :min="0" :max="maxX" :use-grouping="false" input-class="w-24" /></label><label class="flex flex-col gap-1 text-sm">{{ $t("Y (cm)") }}<InputNumber v-model="pointY" :min="0" :max="maxY" :use-grouping="false" input-class="w-24" /></label><Button :label='$t("Set point")' outlined @click="setPointFromCoordinates" /></div>
                <div v-if="mode === 'zones'" class="flex flex-wrap items-end gap-2" role="group" :aria-label='$t("Zone coordinates")'><label v-for="axis in ['X1', 'Y1', 'X2', 'Y2']" :key="axis" class="flex flex-col gap-1 text-sm">{{ axis }} ({{ $t("cm") }})<InputNumber v-if="axis === 'X1'" v-model="zoneX1" :min="0" :max="maxX" :use-grouping="false" input-class="w-20" /><InputNumber v-else-if="axis === 'Y1'" v-model="zoneY1" :min="0" :max="maxY" :use-grouping="false" input-class="w-20" /><InputNumber v-else-if="axis === 'X2'" v-model="zoneX2" :min="0" :max="maxX" :use-grouping="false" input-class="w-20" /><InputNumber v-else v-model="zoneY2" :min="0" :max="maxY" :use-grouping="false" input-class="w-20" /></label><Button :label='$t("Add zone")' outlined :disabled="zoneX1 === zoneX2 || zoneY1 === zoneY2 || zones.length >= (zoneProperties.data.value?.zoneCount.max ?? 1)" @click="addCoordinateZone" /></div>
                <p v-if="mode === 'segments'" class="muted text-sm">{{ $t("Tap rooms to select them.") }}</p>
                <div v-if="mode === 'segments'" class="flex flex-wrap gap-2" role="group" :aria-label='$t("Select rooms")'>
                    <Button v-for="layer in map.data.value.layers.filter(layer => layer.type === 'segment' && layer.metaData.segmentId)" :key="layer.metaData.segmentId" :label="layer.metaData.name || layer.metaData.segmentId" size="small" :outlined="!selectedSegmentIds.includes(layer.metaData.segmentId!)" @click="toggleSegment(layer.metaData.segmentId!)" />
                </div>
                <p v-if="mode === 'pan'" class="muted text-sm">{{ $t("Drag or pinch to move the map.") }}</p>
                <InputNumber v-if="(mode === 'segments' || mode === 'zones') && maxIterations > 1"
                    v-model="iterations" input-id="map-iterations" :min="minIterations" :max="maxIterations"
                    show-buttons button-layout="horizontal" class="w-36" input-class="!w-16 !min-w-0" />
                <label v-if="(mode === 'segments' || mode === 'zones') && maxIterations > 1" for="map-iterations">{{ $t("Passes") }}</label>
                <Button v-if="pending" :label='$t("Clear selection")' text @click="clear" />
                <Button v-if="pending" :label="mode === 'goto' ? $t('Go to point') : mode === 'segments' ? $t('Clean {count} rooms', {count: selectedSegmentIds.length}) : $t('Clean {count} zones', {count: zones.length})"
                    :disabled="!canAct || action.isPending.value || (mode === 'zones' && (zoneProperties.isPending.value || zoneProperties.isError.value || zones.length < (zoneProperties.data.value?.zoneCount.min ?? 1))) || (mode === 'segments' && (segmentation.isPending.value || segmentation.isError.value))"
                    :loading="action.isPending.value" @click="execute" />
            </div>
            <Message v-if="action.isError.value" severity="error">{{ $t("Map action failed. Check the robot state and retry.") }}</Message>
            <Message v-if="segmentation.isError.value && mode === 'segments'" severity="error">{{ $t("Unable to load segment limits.") }}</Message>
            <Message v-if="zoneProperties.isError.value && mode === 'zones'" severity="error">{{ $t("Unable to load zone limits.") }}</Message>
        </template>
    </section>
</template>
