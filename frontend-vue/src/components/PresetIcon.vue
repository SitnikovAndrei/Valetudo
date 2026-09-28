<script setup lang="ts">
import {computed, useId} from "vue";

const props = defineProps<{kind: "fan_speed" | "water_grade" | "operation_mode" | "clean_route"; value: string; level?: number; levels?: number}>();
const clipId = useId();
const droplet = "M12 3C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-12Z";
const wind = "M4 8h9.5a2.5 2.5 0 1 0-2.4-3.2M3 12h15.5a2.5 2.5 0 1 1-2.4 3.2M5 16h5.5a2.5 2.5 0 1 1-2.4 3.2";
const combined = computed(() => props.kind === "operation_mode" && (props.value === "vacuum_and_mop" || props.value === "vacuum_then_mop"));
const width = computed(() => combined.value ? (props.value === "vacuum_then_mop" ? 52 : 44) : 24);
const bars = computed(() => Array.from({length: props.levels ?? 1}, (_, index) => ({
    x: 2 + index * 20 / (props.levels ?? 1),
    width: 20 / (props.levels ?? 1) - 1.5,
    height: 4 + (index + 1) * 15 / (props.levels ?? 1),
    opacity: props.value === "turbo" || index < (props.level ?? 0) ? 1 : 0.3
})));
const waterHeight = computed(() => 19 * (props.level ?? 0) / (props.levels || 1));
const routePath = computed(() => {
    const passes = props.value === "quick" ? 2 : props.value === "intensive" || props.value === "deep" ? 4 : 3;
    let path = "M4 4H18";
    for (let index = 1; index < passes; index++) {
        const y = 4 + index * 16 / (passes - 1);
        path += index % 2 ? `Q22 ${y - 8 / (passes - 1)} 18 ${y}H6` : `Q2 ${y - 8 / (passes - 1)} 6 ${y}H18`;
    }
    return path;
});
</script>

<template>
    <svg :width="width" height="24" :viewBox="`0 0 ${width} 24`" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <template v-if="kind === 'fan_speed'">
            <g v-if="value === 'off'"><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></g>
            <template v-else>
                <rect v-for="(bar, index) in bars" :key="index" :x="bar.x" :y="22 - bar.height" :width="bar.width" :height="bar.height" rx=".8" fill="currentColor" stroke="none" :opacity="bar.opacity" />
                <path v-if="value === 'turbo'" d="M7 2 3 7h4l-2 4" />
            </template>
        </template>
        <template v-else-if="kind === 'water_grade'">
            <defs><clipPath :id="clipId"><rect x="0" :y="22 - waterHeight" width="24" :height="waterHeight" /></clipPath></defs>
            <path :d="droplet" />
            <path v-if="value === 'off'" d="m4 4 16 16" />
            <template v-else>
                <path :d="droplet" fill="currentColor" opacity=".25" stroke="none" />
                <path :d="droplet" fill="currentColor" stroke="none" :clip-path="`url(#${clipId})`" />
            </template>
        </template>
        <template v-else-if="kind === 'operation_mode'">
            <path v-if="value === 'vacuum'" :d="wind" />
            <path v-else-if="value === 'mop'" :d="droplet" />
            <template v-else-if="combined">
                <path :d="wind" />
                <path v-if="value === 'vacuum_then_mop'" d="M24 12h5m-2-2.5 2.5 2.5-2.5 2.5" />
                <path :d="droplet" :transform="value === 'vacuum_then_mop' ? 'translate(28 0)' : 'translate(20 0)'" />
            </template>
            <circle v-else cx="12" cy="12" r="9" />
        </template>
        <template v-else>
            <path :d="routePath" />
            <path v-if="value === 'deep'" :d="routePath" transform="rotate(90 12 12)" opacity=".6" />
        </template>
    </svg>
</template>
