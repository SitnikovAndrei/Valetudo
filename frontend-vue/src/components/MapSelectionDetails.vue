<script setup lang="ts">
import {computed} from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import type {RawMapData} from "../api/RawMapData";
import type {MapCleaning} from "../composables/useMapCleaning";
import {translate} from "../i18n";
import CoordinateInput from "./CoordinateInput.vue";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{cleaning: MapCleaning; map: RawMapData | null | undefined}>();
const cleaning = props.cleaning;
const mode = cleaning.mode;

const summary = computed(() => {
    switch (mode.value) {
        case "all": return {title: translate("Whole home cleanup"), hint: translate("Regular full cleanup.")};
        case "segments": return {title: translate("Rooms"), hint: cleaning.selectedSegmentIds.value.length ? translate("Selected rooms: {count}", {count: cleaning.selectedSegmentIds.value.length}) : translate("Tap rooms to select them.")};
        case "zones": return {title: translate("Zone"), hint: cleaning.zones.value.length ? translate("Selected zones: {count}", {count: cleaning.zones.value.length}) : translate("Drag on the map to select an area.")};
        default: return {title: translate("Go to point"), hint: cleaning.target.value ? translate("Destination selected.") : translate("Tap the destination on the map.")};
    }
});
const unit = computed(() => props.map?.pixelSize ?? 1);
const maxX = computed(() => props.map?.size.x ?? 0);
const maxY = computed(() => props.map?.size.y ?? 0);
const targetInCm = computed(() => cleaning.target.value && [Math.round(cleaning.target.value.x * unit.value), Math.round(cleaning.target.value.y * unit.value)]);

function clamp(value: number, max: number): number {
    return Math.max(0, Math.min(max, value)) / unit.value;
}

function setPoint([x, y]: number[]) {
    cleaning.selectPoint({x: clamp(x, maxX.value), y: clamp(y, maxY.value)});
}

function addZone([x1, y1, x2, y2]: number[]) {
    cleaning.addZone({
        a: {x: clamp(Math.min(x1, x2), maxX.value), y: clamp(Math.min(y1, y2), maxY.value)},
        b: {x: clamp(Math.max(x1, x2), maxX.value), y: clamp(Math.max(y1, y2), maxY.value)}
    });
}
</script>

<template>
    <div class="selection-details">
        <div class="selection-summary"><strong>{{ summary.title }}</strong><small>{{ summary.hint }}</small></div>

        <div v-if="mode === 'segments' && cleaning.segments.value.length" class="chip-list" role="group" :aria-label='$t("Select rooms")'>
            <button v-for="segment in cleaning.segments.value" :key="segment.id" type="button" class="chip" :aria-pressed="cleaning.selectedSegmentIds.value.includes(segment.id)" @click="cleaning.toggleSegment(segment.id)">{{ segment.name }}</button>
        </div>

        <ul v-if="mode === 'zones' && cleaning.zones.value.length" class="chip-list" :aria-label='$t("Selected zones")'>
            <li v-for="(_, index) in cleaning.zones.value" :key="index" class="chip chip--removable">
                <span>{{ $t("Zone {number}", {number: index + 1}) }}</span>
                <button type="button" :aria-label='$t("Remove zone {number}", {number: index + 1})' @click="cleaning.removeZone(index)"><AppIcon name="close" /></button>
            </li>
        </ul>

        <CoordinateInput v-if="map && mode === 'goto'" kind="point" :max-x="maxX" :max-y="maxY" :value="targetInCm" @submit="setPoint" />
        <CoordinateInput v-if="map && mode === 'zones'" kind="zone" :max-x="maxX" :max-y="maxY" :disabled="cleaning.zones.value.length >= cleaning.zoneLimits.value.max" @submit="addZone" />

        <div v-if="(mode === 'segments' || mode === 'zones') && cleaning.iterationLimits.value.max > 1" class="passes">
            <label for="map-iterations">{{ $t("Passes") }}</label>
            <InputNumber v-model="cleaning.iterations.value" input-id="map-iterations" :min="cleaning.iterationLimits.value.min" :max="cleaning.iterationLimits.value.max" show-buttons button-layout="horizontal" class="passes-input" />
        </div>

        <Button v-if="cleaning.pending.value" :label='$t("Clear selection")' size="small" text class="justify-self-start" @click="cleaning.clear()" />
    </div>
</template>

<style scoped>
.selection-details { display: grid; gap: 12px; }
.selection-summary { display: grid; gap: 2px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--app-surface-soft); }
.selection-summary strong { font-size: var(--text-sm); }
.selection-summary small { color: var(--app-muted); font-size: var(--text-xs); }
.chip-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.chip { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 12px; border: 1px solid var(--app-border); border-radius: 999px; background: var(--app-surface-soft); color: var(--app-secondary); font-size: var(--text-sm); font-weight: 600; }
button.chip { cursor: pointer; }
button.chip:hover { border-color: var(--app-accent); }
.chip[aria-pressed="true"] { border-color: var(--app-accent); background: var(--app-accent); color: var(--app-on-accent); }
.chip--removable { padding-right: 4px; }
.chip--removable button { display: grid; width: 28px; height: 28px; place-items: center; border: 0; border-radius: 999px; background: transparent; color: inherit; cursor: pointer; }
.chip--removable button:hover { background: var(--app-accent-soft); color: var(--app-accent); }
.chip--removable :deep(.app-icon) { width: 14px; height: 14px; }
.passes { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: var(--text-sm); font-weight: 600; }
.passes-input { width: 8.5rem; }
.passes-input :deep(input) { width: 100%; min-width: 0; text-align: center; }
</style>
