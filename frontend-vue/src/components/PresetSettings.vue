<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Select from "primevue/select";
import Message from "primevue/message";
import {Capability} from "../api/types";
import {RobotAttributeClass, type PresetSelectionState, type RobotAttribute} from "../api/RawRobotState";
import {fetchPresetSelections, updatePresetSelection} from "../api/client";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import SettingRow from "./SettingRow.vue";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]; compact?: boolean}>();
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
</script>

<template>
    <template v-for="control in visible" :key="control.type">
        <SettingRow :name="control.label">
            <Select :model-value="selected(control.type)" :options="(options.data.value?.[control.type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :aria-label="control.label" :title="valueLabel(selected(control.type))" :disabled="options.isPending.value || options.isError.value || mutation.isPending.value" @update:model-value="value => mutation.mutate({capability: control.capability, value})" />
        </SettingRow>
    </template>
    <Message v-if="options.isError.value || mutation.isError.value" severity="error" class="mt-3">{{ $t("A robot control request failed.") }}</Message>
</template>
