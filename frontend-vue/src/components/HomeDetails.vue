<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability, type ValetudoDataPoint} from "../api/types";
import {RobotAttributeClass, type RobotAttribute} from "../api/RawRobotState";
import {fetchCurrentStatistics, fetchTotalStatistics, sendAutoEmptyDockManualTriggerCommand, sendMopDockCleanManualTriggerCommand, sendMopDockDryManualTriggerCommand} from "../api/client";
import {translate} from "../i18n";
import {formatStatisticsValue} from "../statistics";
import HomeDockActionIcon from "./HomeDockActionIcon.vue";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]}>();
const robotState = computed(() => props.attributes.find(attribute => attribute.__class === RobotAttributeClass.StatusState)?.value);
const dockState = computed(() => props.attributes.find(attribute => attribute.__class === RobotAttributeClass.DockStatusState)?.value ?? "idle");
const mopAttached = computed(() => props.attributes.some(attribute => attribute.__class === RobotAttributeClass.AttachmentState && attribute.type === "mop" && attribute.attached));
const dockStateKnown = computed(() => !props.capabilities.some(capability => [Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability)) || props.attributes.some(attribute => attribute.__class === RobotAttributeClass.DockStatusState));
const canEmpty = computed(() => dockStateKnown.value && robotState.value === "docked" && ["idle", "pause"].includes(dockState.value));
const canClean = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "cleaning", "pause"].includes(dockState.value));
const canDry = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "drying", "pause"].includes(dockState.value));
const hasTotalStatistics = computed(() => props.capabilities.includes(Capability.TotalStatistics));
const hasDockActions = computed(() => props.capabilities.some(capability => [Capability.AutoEmptyDockManualTrigger, Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability)));
const showCurrentStatistics = computed(() => !hasTotalStatistics.value && props.capabilities.includes(Capability.CurrentStatistics) && robotState.value !== undefined && !["idle", "docked"].includes(robotState.value));
const showStatistics = computed(() => hasTotalStatistics.value || showCurrentStatistics.value);
const totalStats = useQuery({queryKey: ["totalStatistics"], queryFn: fetchTotalStatistics, enabled: hasTotalStatistics});
const currentStats = useQuery({queryKey: ["currentStatistics"], queryFn: fetchCurrentStatistics, enabled: showCurrentStatistics});
const statistics = computed(() => [...(hasTotalStatistics.value ? totalStats.data.value ?? [] : currentStats.data.value ?? [])].sort((a, b) => ({time: 0, area: 1, count: 2}[a.type] - {time: 0, area: 1, count: 2}[b.type])));
const statisticsPending = computed(() => hasTotalStatistics.value ? totalStats.isPending.value : currentStats.isPending.value);
const statisticsError = computed(() => hasTotalStatistics.value ? totalStats.isError.value : currentStats.isError.value);
const dockMutation = useMutation({mutationFn: async (action: "empty" | "clean" | "dry" | "stop_clean" | "stop_dry") => {
    if (action === "empty") return sendAutoEmptyDockManualTriggerCommand();
    if (action === "clean" || action === "stop_clean") return sendMopDockCleanManualTriggerCommand(action === "clean" ? "start" : "stop");
    return sendMopDockDryManualTriggerCommand(action === "dry" ? "start" : "stop");
}});

function statLabel(type: ValetudoDataPoint["type"]): string {
    return {time: translate("Cleaning time"), area: translate("Cleaned area"), count: translate("Cleanups")}[type];
}
</script>

<template>
    <div v-if="showStatistics || hasDockActions" class="home-details">
        <template v-if="showStatistics">
            <span class="page-header-kicker">{{ hasTotalStatistics ? $t("Total statistics") : $t("Current statistics") }}</span>
            <div class="home-current-stats"><div v-for="stat in statistics" :key="stat.type"><strong>{{ formatStatisticsValue(stat) }}</strong><small>{{ statLabel(stat.type) }}</small></div><p v-if="statisticsPending" class="muted text-xs">{{ $t("Loading…") }}</p></div>
            <Message v-if="statisticsError" severity="error" class="mt-3">{{ hasTotalStatistics ? $t("Unable to load total statistics.") : $t("A robot control request failed.") }}</Message>
        </template>
        <div v-if="hasDockActions" class="home-dock-actions" :class="{'mt-4': showStatistics}">
            <Button v-if="capabilities.includes(Capability.AutoEmptyDockManualTrigger)" :label='$t("Empty dustbin")' outlined :disabled="dockMutation.isPending.value || !canEmpty" @click="dockMutation.mutate('empty')"><template #icon><HomeDockActionIcon action="empty" /></template></Button>
            <Button v-if="capabilities.includes(Capability.MopDockCleanManualTrigger)" :label="dockState === 'cleaning' ? $t('Stop mop cleaning') : $t('Clean mop')" outlined :disabled="dockMutation.isPending.value || !canClean" @click="dockMutation.mutate(dockState === 'cleaning' ? 'stop_clean' : 'clean')"><template #icon><HomeDockActionIcon :action="dockState === 'cleaning' ? 'stop' : 'wash'" /></template></Button>
            <Button v-if="capabilities.includes(Capability.MopDockDryManualTrigger)" :label="dockState === 'drying' ? $t('Stop mop drying') : $t('Dry mop')" outlined :disabled="dockMutation.isPending.value || !canDry" @click="dockMutation.mutate(dockState === 'drying' ? 'stop_dry' : 'dry')"><template #icon><HomeDockActionIcon :action="dockState === 'drying' ? 'stop' : 'dry'" /></template></Button>
        </div>
        <Message v-if="dockMutation.isError.value" severity="error" class="mt-4">{{ $t("A robot control request failed.") }}</Message>
    </div>
</template>
