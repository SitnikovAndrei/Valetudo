<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Select from "primevue/select";
import Message from "primevue/message";
import {Capability, type CleanRoute} from "../api/types";
import {RobotAttributeClass, type PresetSelectionState, type RobotAttribute} from "../api/RawRobotState";
import {fetchPresetSelections, updatePresetSelection, fetchCleanRoute, fetchCleanRouteControlProperties, sendCleanRoute} from "../api/client";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import SettingRow from "./SettingRow.vue";
import PresetIcon from "./PresetIcon.vue";
import {presetLevels} from "../presetLevels";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]; compact?: boolean; variant?: "segmented"}>();
const queryClient = useQueryClient();
const controls = computed(() => [
    {capability: Capability.FanSpeedControl, type: "fan_speed", label: translate(props.compact ? "Power" : "Fan speed")},
    {capability: Capability.WaterUsageControl, type: "water_grade", label: translate(props.compact ? "Water supply" : "Water usage")},
    {capability: Capability.OperationModeControl, type: "operation_mode", label: translate(props.compact ? "Mode" : "Operation mode")}
] as const);
const visible = computed(() => controls.value.filter(control => props.capabilities.includes(control.capability)));
const options = useQuery({
    queryKey: ["homePresetOptions", visible],
    queryFn: async () => Object.fromEntries(await Promise.all(visible.value.map(async control => [control.type, (await fetchPresetSelections(control.capability)).filter(value => value !== "custom")]))),
    enabled: computed(() => visible.value.length > 0)
});
const segmentedOptions = computed(() => Object.fromEntries(visible.value.map(control => {
    const values: PresetSelectionState["value"][] = options.data.value?.[control.type] ?? [];
    return [control.type, control.type === "operation_mode" ? values.map(value => ({value, level: 0, levels: 0})) : presetLevels(values)];
})));
const mutation = useMutation({
    mutationFn: ({capability, value}: {capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl; value: PresetSelectionState["value"]}) => updatePresetSelection(capability, value),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["robotAttributes"]})
});
function selected(type: PresetSelectionState["type"]) {
    return (props.attributes.find(attribute => attribute.__class === RobotAttributeClass.PresetSelectionState && attribute.type === type) as PresetSelectionState | undefined)?.value;
}
const hasRoute = computed(() => props.variant === "segmented" && props.capabilities.includes(Capability.CleanRouteControl));
const route = useQuery({queryKey: ["cleanRoute"], queryFn: fetchCleanRoute, enabled: hasRoute});
const routeProperties = useQuery({queryKey: ["cleanRouteProperties"], queryFn: fetchCleanRouteControlProperties, enabled: hasRoute});
const routeMutation = useMutation({mutationFn: (value: CleanRoute) => sendCleanRoute({route: value}), onSuccess: () => queryClient.invalidateQueries({queryKey: ["cleanRoute"]})});
</script>

<template>
    <template v-for="control in visible" :key="control.type">
        <div v-if="variant === 'segmented'" class="segmented-preset">
            <h3>{{ control.label }}: <span>{{ valueLabel(selected(control.type)) }}</span></h3>
            <div class="icon-segments" role="radiogroup" :aria-label="control.label" :style="{'--segment-count': segmentedOptions[control.type]?.length || 1}">
                <button v-for="option in segmentedOptions[control.type]" :key="option.value" type="button" role="radio" :aria-checked="selected(control.type) === option.value" :aria-label="valueLabel(option.value)" :title="valueLabel(option.value)" :disabled="options.isPending.value || options.isError.value || mutation.isPending.value" @click="mutation.mutate({capability: control.capability, value: option.value})">
                    <PresetIcon :kind="control.type" :value="option.value" :level="option.level" :levels="option.levels" />
                </button>
            </div>
        </div>
        <SettingRow v-else :name="control.label">
            <Select :model-value="selected(control.type)" :options="(options.data.value?.[control.type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :aria-label="control.label" :title="valueLabel(selected(control.type))" :disabled="options.isPending.value || options.isError.value || mutation.isPending.value" @update:model-value="value => mutation.mutate({capability: control.capability, value})" />
        </SettingRow>
    </template>
    <div v-if="hasRoute" class="segmented-preset">
        <h3>{{ $t("Clean route") }}: <span>{{ valueLabel(route.data.value) }}</span></h3>
        <div class="icon-segments" role="radiogroup" :aria-label='$t("Clean route")' :style="{'--segment-count': routeProperties.data.value?.supportedRoutes.length || 1}">
            <button v-for="value in routeProperties.data.value?.supportedRoutes ?? []" :key="value" type="button" role="radio" :aria-checked="route.data.value === value" :aria-label="valueLabel(value)" :title="valueLabel(value)" :disabled="route.isPending.value || route.isError.value || routeProperties.isPending.value || routeProperties.isError.value || routeMutation.isPending.value" @click="routeMutation.mutate(value)">
                <PresetIcon kind="clean_route" :value="value" />
            </button>
        </div>
        <Message v-if="route.isError.value || routeProperties.isError.value || routeMutation.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
    </div>
    <Message v-if="options.isError.value || mutation.isError.value" severity="error" class="mt-3">{{ $t("A robot control request failed.") }}</Message>
</template>

<style scoped>
.segmented-preset { min-width: 0; display: grid; gap: 10px; margin-bottom: 22px; }
.segmented-preset h3 { margin: 0; font-size: var(--text-sm); font-weight: 600; }
.segmented-preset h3 span { color: var(--app-accent); }
.icon-segments { display: grid; grid-template-columns: repeat(var(--segment-count), minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: var(--app-surface-soft); border: 1px solid var(--app-border); min-width: 0; }
.icon-segments button { display: flex; align-items: center; justify-content: center; min-width: 0; height: 44px; padding: 0; border: 0; border-radius: 10px; background: transparent; color: var(--app-muted); cursor: pointer; }
.icon-segments button svg { width: auto; max-width: 100%; height: 24px; flex-shrink: 1; }
.icon-segments button:hover:not(:disabled) { color: var(--app-text); }
.icon-segments button[aria-checked="true"] { background: var(--app-accent); color: var(--app-on-accent); }
.icon-segments button[aria-checked="true"]:hover:not(:disabled) { color: var(--app-on-accent); }
.icon-segments button:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
.icon-segments button:disabled { opacity: .5; cursor: default; }
</style>
