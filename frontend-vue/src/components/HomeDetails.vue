<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import {Capability} from "../api/types";
import {RobotAttributeClass, type PresetSelectionState, type RobotAttribute} from "../api/RawRobotState";
import {fetchCurrentStatistics, fetchPresetSelections, sendAutoEmptyDockManualTriggerCommand, sendMopDockCleanManualTriggerCommand, sendMopDockDryManualTriggerCommand, updatePresetSelection} from "../api/client";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]}>();
const queryClient = useQueryClient();
const presetControls = computed(() => [
    {capability: Capability.FanSpeedControl, type: "fan_speed", label: translate("Fan speed")},
    {capability: Capability.WaterUsageControl, type: "water_grade", label: translate("Water usage")},
    {capability: Capability.OperationModeControl, type: "operation_mode", label: translate("Operation mode")}
] as const);
const visiblePresets = computed(() => presetControls.value.filter(control => props.capabilities.includes(control.capability)));
const robotState = computed(() => props.attributes.find(attribute => attribute.__class === RobotAttributeClass.StatusState)?.value);
const dockState = computed(() => props.attributes.find(attribute => attribute.__class === RobotAttributeClass.DockStatusState)?.value ?? "idle");
const mopAttached = computed(() => props.attributes.some(attribute => attribute.__class === RobotAttributeClass.AttachmentState && attribute.type === "mop" && attribute.attached));
const dockStateKnown = computed(() => !props.capabilities.some(capability => [Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability)) || props.attributes.some(attribute => attribute.__class === RobotAttributeClass.DockStatusState));
const canEmpty = computed(() => dockStateKnown.value && robotState.value === "docked" && ["idle", "pause"].includes(dockState.value));
const canClean = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "cleaning", "pause"].includes(dockState.value));
const canDry = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "drying", "pause"].includes(dockState.value));
const options = useQuery({
    queryKey: ["homePresetOptions", visiblePresets],
    queryFn: async () => Object.fromEntries(await Promise.all(visiblePresets.value.map(async control => [control.type, (await fetchPresetSelections(control.capability)).filter(value => value !== "custom")]))),
    enabled: computed(() => visiblePresets.value.length > 0)
});
const currentStats = useQuery({queryKey: ["currentStatistics"], queryFn: fetchCurrentStatistics, enabled: computed(() => props.capabilities.includes(Capability.CurrentStatistics))});
const presetMutation = useMutation({
    mutationFn: ({capability, value}: {capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl; value: PresetSelectionState["value"]}) => updatePresetSelection(capability, value),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["robotAttributes"]})
});
const dockMutation = useMutation({mutationFn: async (action: "empty" | "clean" | "dry" | "stop_clean" | "stop_dry") => {
    if (action === "empty") return sendAutoEmptyDockManualTriggerCommand();
    if (action === "clean" || action === "stop_clean") return sendMopDockCleanManualTriggerCommand(action === "clean" ? "start" : "stop");
    return sendMopDockDryManualTriggerCommand(action === "dry" ? "start" : "stop");
}});

function selected(type: PresetSelectionState["type"]) {
    return (props.attributes.find(attribute => attribute.__class === RobotAttributeClass.PresetSelectionState && attribute.type === type) as PresetSelectionState | undefined)?.value;
}

function statValue(type: string, value: number) {
    if (type === "area") return `${(value / 10000).toFixed(2)} m²`;
    if (type === "time") return `${Math.round(value / 60)} min`;
    return String(value);
}
</script>

<template>
    <section v-if="visiblePresets.length || capabilities.includes(Capability.CurrentStatistics) || capabilities.some(capability => [Capability.AutoEmptyDockManualTrigger, Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability))" class="panel md:col-span-2">
        <h2 class="mb-4 text-xl font-semibold">{{ $t("Robot controls") }}</h2>
        <div v-for="control in visiblePresets" :key="control.type" class="mb-4 flex flex-wrap items-center justify-between gap-3"><label :for="control.type">{{ control.label }}</label><Select :id="control.type" :model-value="selected(control.type)" :options="(options.data.value?.[control.type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :disabled="options.isPending.value || presetMutation.isPending.value" @update:model-value="value => presetMutation.mutate({capability: control.capability, value})" /></div>
        <div class="flex flex-wrap gap-2">
            <Button v-if="capabilities.includes(Capability.AutoEmptyDockManualTrigger)" :label='$t("Empty dustbin")' outlined :disabled="dockMutation.isPending.value || !canEmpty" @click="dockMutation.mutate('empty')" />
            <Button v-if="capabilities.includes(Capability.MopDockCleanManualTrigger)" :label="dockState === 'cleaning' ? $t('Stop mop cleaning') : $t('Clean mop')" outlined :disabled="dockMutation.isPending.value || !canClean" @click="dockMutation.mutate(dockState === 'cleaning' ? 'stop_clean' : 'clean')" />
            <Button v-if="capabilities.includes(Capability.MopDockDryManualTrigger)" :label="dockState === 'drying' ? $t('Stop mop drying') : $t('Dry mop')" outlined :disabled="dockMutation.isPending.value || !canDry" @click="dockMutation.mutate(dockState === 'drying' ? 'stop_dry' : 'dry')" />
        </div>
        <div v-if="capabilities.includes(Capability.CurrentStatistics)" class="mt-5"><h3 class="mb-2 font-semibold">{{ $t("Current statistics") }}</h3><p v-if="currentStats.isPending.value" role="status">{{ $t("Loading…") }}</p><div v-else class="flex flex-wrap gap-5"><p v-for="stat in currentStats.data.value" :key="stat.type">{{ valueLabel(stat.type) }}: {{ statValue(stat.type, stat.value) }}</p></div></div>
        <Message v-if="options.isError.value || presetMutation.isError.value || dockMutation.isError.value || currentStats.isError.value" severity="error" class="mt-4">{{ $t("A robot control request failed.") }}</Message>
    </section>
</template>
