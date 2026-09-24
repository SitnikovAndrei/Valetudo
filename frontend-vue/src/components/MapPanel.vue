<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, ref, watch} from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import {RawMapEntityType, RawMapLayerMaterial, type RawMapData} from "../api/RawMapData";
import type {MapZone, Point} from "../composables/useMapCleaning";
import MapCanvas from "./MapCanvas.vue";
import AppIcon from "./AppIcon.vue";

type CanvasMode = "segments" | "zones" | "goto" | "pan";
const props = defineProps<{
    map: RawMapData | null | undefined;
    loading: boolean;
    error: boolean;
    paletteMode: "light" | "dark";
    mode: CanvasMode;
    selectedSegmentIds: string[];
    zones: MapZone[];
    target?: Point;
    roomNames: string[];
}>();
defineEmits<{
    "segment-click": [id: string];
    "zone-created": [zone: MapZone];
    "zone-remove": [index: number];
    "point-selected": [point: Point];
    retry: [];
}>();

const canvas = ref<InstanceType<typeof MapCanvas>>();
const expanded = ref(false);
const carpetMaterials = [RawMapLayerMaterial.Carpet, RawMapLayerMaterial.CarpetLow, RawMapLayerMaterial.CarpetHigh];
const hasCarpets = computed(() => props.map?.entities.some(entity => entity.type === RawMapEntityType.Carpet) === true
    || props.map?.layers.some(layer => layer.metaData.material !== undefined && carpetMaterials.includes(layer.metaData.material)) === true);

watch(expanded, async value => {
    document.body.classList.toggle("map-expanded", value);
    await nextTick();
    requestAnimationFrame(() => canvas.value?.fitMap());
});
onBeforeUnmount(() => document.body.classList.remove("map-expanded"));
</script>

<template>
    <div class="panel map-panel" :class="{'map-panel--expanded': expanded}" @keydown.esc="expanded = false">
        <div class="map-panel-heading">
            <div><span class="kicker">{{ $t("Robot map") }}</span><h2>{{ $t("Floor plan") }}</h2></div>
            <button v-if="map" class="icon-button" type="button" :aria-label="expanded ? $t('Close') : $t('Fullscreen')" :title="expanded ? $t('Close') : $t('Fullscreen')" :aria-pressed="expanded" @click="expanded = !expanded">
                <AppIcon :name="expanded ? 'close' : 'fullscreen'" />
            </button>
        </div>
        <div v-if="loading" class="async-state" role="status">{{ $t("Loading map…") }}</div>
        <div v-else-if="error" class="async-state"><Message severity="error">{{ $t("Unable to load map data.") }}</Message><Button :label='$t("Retry")' outlined @click="$emit('retry')" /></div>
        <div v-else-if="!map" class="async-state">{{ $t("No map data reported.") }}</div>
        <div v-else class="map-panel-viewport">
            <MapCanvas ref="canvas" :map="map" :palette-mode="paletteMode" :mode="mode" :selected-segment-ids="selectedSegmentIds" :zones="zones" :target="target"
                @segment-click="id => $emit('segment-click', id)" @zone-created="zone => $emit('zone-created', zone)"
                @zone-remove="index => $emit('zone-remove', index)" @point-selected="point => $emit('point-selected', point)" />
            <div v-if="hasCarpets" class="map-overlay map-carpet-legend"><span aria-hidden="true" />{{ $t("Carpets") }}</div>
            <div class="map-overlay map-zoom" role="group" :aria-label='$t("Map zoom")'>
                <button type="button" :aria-label='$t("Zoom in")' :title='$t("Zoom in")' @click="canvas?.zoomIn()"><AppIcon name="plus" /></button>
                <button type="button" :aria-label='$t("Zoom out")' :title='$t("Zoom out")' @click="canvas?.zoomOut()"><AppIcon name="minus" /></button>
                <button type="button" :aria-label='$t("Fit map")' :title='$t("Fit map")' @click="canvas?.fitMap()"><AppIcon name="fit" /></button>
            </div>
        </div>
        <div v-if="map && roomNames.length" class="map-panel-footer"><span v-for="name in roomNames.slice(0, 4)" :key="name">{{ name }}</span><span v-if="roomNames.length > 4">+{{ roomNames.length - 4 }}</span></div>
    </div>
</template>

<style scoped>
.map-panel { overflow: hidden; padding: 0; }
.map-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 12px 16px 12px 20px; }
.map-panel-heading h2 { margin: 2px 0 0; font-size: var(--text-lg); }
.map-panel-viewport { position: relative; height: clamp(480px, calc(100dvh - 190px), 800px); overflow: hidden; border-block: 1px solid var(--app-border); background: var(--app-surface-soft); }
.map-overlay { position: absolute; border: 1px solid var(--app-border); border-radius: var(--radius-sm); background: var(--app-surface); box-shadow: 0 4px 12px rgb(0 0 0 / 8%); }
.map-carpet-legend { bottom: 12px; left: 12px; display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 5px 10px; color: var(--app-secondary); font-size: var(--text-xs); font-weight: 600; pointer-events: none; }
.map-carpet-legend span { width: 15px; height: 15px; border: 1px solid var(--map-carpet-border); border-radius: 3px; background: repeating-linear-gradient(135deg, var(--map-carpet-fill) 0 3px, var(--map-carpet-line) 3px 4px); }
.map-zoom { right: 12px; bottom: 12px; display: grid; overflow: hidden; }
.map-zoom button { display: grid; width: 40px; height: 40px; place-items: center; border: 0; background: transparent; color: var(--app-text); cursor: pointer; }
.map-zoom button:hover { background: var(--app-accent-soft); color: var(--app-accent); }
.map-zoom button + button { border-top: 1px solid var(--app-border); }
.map-zoom :deep(.app-icon) { width: 18px; height: 18px; }
.map-panel-footer { display: flex; flex-wrap: wrap; gap: 6px 16px; min-height: 44px; align-items: center; padding: 8px 20px; color: var(--app-secondary); font-size: var(--text-xs); }

.map-panel--expanded { position: fixed; z-index: 50; inset: 8px; display: flex; flex-direction: column; margin: 0; box-shadow: var(--app-shadow); }
.map-panel--expanded .map-panel-viewport { flex: 1; min-height: 0; height: auto; }
.map-panel--expanded .map-panel-footer { display: none; }

@media (max-width: 900px) {
    .map-panel-viewport { height: clamp(400px, 60dvh, 620px); }
}
@media (max-width: 700px) {
    .map-panel { margin-inline: -14px; border-inline: 0; border-radius: 0; }
    .map-panel-heading { min-height: 56px; padding: 8px 14px; }
    .map-panel-viewport { height: clamp(360px, 55dvh, 520px); }
    .map-panel-footer { display: none; }
    .map-panel--expanded { inset: 0; border: 0; }
}
</style>
