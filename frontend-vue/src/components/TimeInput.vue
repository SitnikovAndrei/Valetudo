<script setup lang="ts">
import {computed} from "vue";

/**
 * 24-hour "HH:MM" input. A native <input type="time"> follows the browser's UI language,
 * so a Russian page could still show "10:00 PM"; this one always uses a 24-hour clock.
 */
const props = defineProps<{modelValue: string; disabled?: boolean; label?: string}>();
const emit = defineEmits<{"update:modelValue": [value: string]}>();

const parts = computed(() => {
    const [hour, minute] = props.modelValue.split(":").map(Number);
    return {hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0};
});
const pad = (value: number) => value.toString().padStart(2, "0");

function update(part: "hour" | "minute", raw: string | number) {
    const limit = part === "hour" ? 23 : 59;
    const parsed = Number.parseInt(String(raw), 10);
    const value = Number.isFinite(parsed) ? ((parsed % (limit + 1)) + limit + 1) % (limit + 1) : 0;
    const next = {...parts.value, [part]: value};
    emit("update:modelValue", `${pad(next.hour)}:${pad(next.minute)}`);
}

function onInput(part: "hour" | "minute", event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "").slice(0, 2);
    input.value = digits;
    if (digits.length === 2) update(part, digits);
}

function onKey(part: "hour" | "minute", event: KeyboardEvent) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    update(part, parts.value[part] + (event.key === "ArrowUp" ? 1 : -1));
}
</script>

<template>
    <span class="time-input" :class="{'time-input--disabled': disabled}" role="group" :aria-label="label">
        <input :value="pad(parts.hour)" inputmode="numeric" maxlength="2" :disabled="disabled" :aria-label="$t('Hours')"
            @input="onInput('hour', $event)" @blur="update('hour', ($event.target as HTMLInputElement).value)" @keydown="onKey('hour', $event)" @focus="($event.target as HTMLInputElement).select()" />
        <span aria-hidden="true">:</span>
        <input :value="pad(parts.minute)" inputmode="numeric" maxlength="2" :disabled="disabled" :aria-label="$t('Minutes')"
            @input="onInput('minute', $event)" @blur="update('minute', ($event.target as HTMLInputElement).value)" @keydown="onKey('minute', $event)" @focus="($event.target as HTMLInputElement).select()" />
    </span>
</template>

<style scoped>
.time-input { display: inline-flex; align-items: center; gap: 2px; min-height: 40px; padding: 0 10px; border: 1px solid var(--p-inputtext-border-color, var(--app-border)); border-radius: var(--radius-sm); background: var(--app-surface); color: var(--app-text); font-variant-numeric: tabular-nums; }
.time-input:focus-within { border-color: var(--app-accent); }
.time-input input { width: 2ch; padding: 0; border: 0; background: transparent; color: inherit; text-align: center; outline: none; }
.time-input--disabled { opacity: .6; }
</style>
