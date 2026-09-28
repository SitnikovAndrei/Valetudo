<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Message from "primevue/message";
import {Capability, type CleanRoute} from "../api/types";
import {RobotAttributeClass, type PresetSelectionState, type RobotAttribute} from "../api/RawRobotState";
import {fetchPresetSelections, updatePresetSelection, fetchCleanRoute, fetchCleanRouteControlProperties, sendCleanRoute} from "../api/client";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import SettingRow from "./SettingRow.vue";

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
            <SelectButton :model-value="selected(control.type)" :options="(options.data.value?.[control.type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :allow-empty="false" :aria-label="control.label" :disabled="options.isPending.value || options.isError.value || mutation.isPending.value" @update:model-value="value => mutation.mutate({capability: control.capability, value})" />
        </div>
        <SettingRow v-else :name="control.label">
            <Select :model-value="selected(control.type)" :options="(options.data.value?.[control.type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :aria-label="control.label" :title="valueLabel(selected(control.type))" :disabled="options.isPending.value || options.isError.value || mutation.isPending.value" @update:model-value="value => mutation.mutate({capability: control.capability, value})" />
        </SettingRow>
    </template>
    <div v-if="hasRoute" class="segmented-preset">
        <h3>{{ $t("Clean route") }}: <span>{{ valueLabel(route.data.value) }}</span></h3>
        <SelectButton :model-value="route.data.value" :options="(routeProperties.data.value?.supportedRoutes ?? []).map(value => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :allow-empty="false" :aria-label='$t("Clean route")' :disabled="route.isPending.value || route.isError.value || routeProperties.isPending.value || routeProperties.isError.value || routeMutation.isPending.value" @update:model-value="value => routeMutation.mutate(value)" />
        <Message v-if="route.isError.value || routeProperties.isError.value || routeMutation.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
    </div>
    <Message v-if="options.isError.value || mutation.isError.value" severity="error" class="mt-3">{{ $t("A robot control request failed.") }}</Message>
</template>

<style scoped>
.segmented-preset { display: grid; gap: 10px; margin-bottom: 22px; }
.segmented-preset h3 { margin: 0; font-size: var(--text-sm); font-weight: 600; }
.segmented-preset h3 span { color: var(--app-accent); }
.segmented-preset :deep(.p-selectbutton) { display: flex; flex-wrap: wrap; gap: 6px; }
.segmented-preset :deep(.p-togglebutton) { flex: 1 1 auto; min-width: 0; min-height: 44px; white-space: normal; border-radius: var(--radius-sm); }
.segmented-preset :deep(.p-togglebutton-checked), .segmented-preset :deep(.p-togglebutton-checked .p-togglebutton-content) { background: var(--app-accent); color: var(--app-on-accent); }
</style>
