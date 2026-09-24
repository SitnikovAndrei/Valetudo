<script setup lang="ts">
import type {CleaningMode} from "../composables/useMapCleaning";
import type {IconName} from "./icons";
import AppIcon from "./AppIcon.vue";

defineProps<{modes: CleaningMode[]; modelValue: CleaningMode; mapAvailable: boolean}>();
defineEmits<{"update:modelValue": [mode: CleaningMode]}>();

const options: Record<CleaningMode, {label: string; icon: IconName}> = {
    all: {label: "Whole home", icon: "whole-home"},
    segments: {label: "Rooms", icon: "rooms"},
    zones: {label: "Zone", icon: "zone"},
    goto: {label: "To point", icon: "point"}
};
</script>

<template>
    <div class="mode-picker" :style="{'--mode-count': modes.length}" role="group" :aria-label='$t("Cleaning area")'>
        <button v-for="mode in modes" :key="mode" type="button" :aria-pressed="modelValue === mode" :disabled="mode !== 'all' && !mapAvailable" @click="$emit('update:modelValue', mode)">
            <AppIcon :name="options[mode].icon" />{{ $t(options[mode].label) }}
        </button>
    </div>
</template>

<style scoped>
.mode-picker { display: grid; grid-template-columns: repeat(var(--mode-count), minmax(0, 1fr)); gap: 8px; }
.mode-picker button { display: grid; justify-items: center; align-content: center; gap: 4px; min-height: 60px; padding: 6px 4px; border: 1px solid var(--app-border); border-radius: var(--radius-sm); background: var(--app-surface); color: var(--app-secondary); font-size: var(--text-xs); font-weight: 600; cursor: pointer; }
.mode-picker button:hover:not(:disabled) { border-color: var(--app-accent); color: var(--app-accent); }
.mode-picker button[aria-pressed="true"] { border-color: var(--app-accent); background: var(--app-accent-soft); color: var(--app-accent); }
.mode-picker button:disabled { cursor: not-allowed; opacity: .55; }
.mode-picker :deep(.app-icon) { width: 20px; height: 20px; }

@media (max-width: 700px) {
    .mode-picker { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mode-picker button { display: flex; justify-content: center; gap: 8px; min-height: 44px; }
    .mode-picker :deep(.app-icon) { width: 18px; height: 18px; }
}
</style>
