<script setup lang="ts">
import {computed, ref, watch} from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";

/** Manual entry of a point (X, Y) or a rectangle (X1, Y1, X2, Y2) in centimeters. */
const props = defineProps<{kind: "point" | "zone"; maxX: number; maxY: number; value?: number[]; disabled?: boolean}>();
const emit = defineEmits<{submit: [values: number[]]}>();

const axes = computed(() => props.kind === "point" ? ["X", "Y"] : ["X1", "Y1", "X2", "Y2"]);
const values = ref<number[]>(axes.value.map(() => 0));
watch(() => props.value, value => {
    if (value?.length === axes.value.length) values.value = [...value];
}, {immediate: true});

const valid = computed(() => props.kind === "point" || (values.value[0] !== values.value[2] && values.value[1] !== values.value[3]));
</script>

<template>
    <details class="coordinate-input">
        <summary>{{ $t("Enter coordinates") }}</summary>
        <div class="coordinate-input-fields" role="group" :aria-label="kind === 'point' ? $t('Point coordinates') : $t('Zone coordinates')">
            <label v-for="(axis, index) in axes" :key="axis">{{ axis }}, {{ $t("cm") }}
                <InputNumber v-model="values[index]" :min="0" :max="index % 2 ? maxY : maxX" :use-grouping="false" input-class="coordinate-input-number" />
            </label>
            <Button :label="kind === 'point' ? $t('Set point') : $t('Add zone')" outlined size="small" :disabled="disabled || !valid" @click="emit('submit', [...values])" />
        </div>
    </details>
</template>

<style scoped>
.coordinate-input { color: var(--app-secondary); font-size: var(--text-sm); }
.coordinate-input summary { width: fit-content; cursor: pointer; }
.coordinate-input summary:hover { color: var(--app-accent); }
.coordinate-input-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin-top: 8px; }
.coordinate-input-fields label { display: grid; gap: 4px; font-size: var(--text-xs); }
.coordinate-input-fields :deep(.coordinate-input-number) { width: 5.5rem; }
</style>
