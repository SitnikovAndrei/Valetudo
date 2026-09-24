<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
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
const statisticsOrder = {time: 0, area: 1, count: 2};
const statistics = computed(() => [...(hasTotalStatistics.value ? totalStats.data.value ?? [] : currentStats.data.value ?? [])].sort((a, b) => statisticsOrder[a.type] - statisticsOrder[b.type]));
const statisticsPending = computed(() => hasTotalStatistics.value ? totalStats.isPending.value : currentStats.isPending.value);
const statisticsError = computed(() => hasTotalStatistics.value ? totalStats.isError.value : currentStats.isError.value);
const queryClient = useQueryClient();
const dockMutation = useMutation({onSuccess: () => queryClient.invalidateQueries({queryKey: ["robotAttributes"]}), mutationFn: async (action: "empty" | "clean" | "dry" | "stop_clean" | "stop_dry") => {
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
            <span class="kicker">{{ hasTotalStatistics ? $t("Total statistics") : $t("Current statistics") }}</span>
            <dl class="stat-list">
                <div v-for="stat in statistics" :key="stat.type"><dt>{{ statLabel(stat.type) }}</dt><dd>{{ formatStatisticsValue(stat) }}</dd></div>
            </dl>
            <p v-if="statisticsPending" class="muted text-xs">{{ $t("Loading…") }}</p>
            <Message v-if="statisticsError" severity="error">{{ hasTotalStatistics ? $t("Unable to load total statistics.") : $t("Unable to load current statistics.") }}</Message>
        </template>
        <div v-if="hasDockActions" class="dock-actions">
            <Button v-if="capabilities.includes(Capability.AutoEmptyDockManualTrigger)" :label='$t("Empty dustbin")' outlined :disabled="dockMutation.isPending.value || !canEmpty" @click="dockMutation.mutate('empty')">
                <template #icon><HomeDockActionIcon action="empty" /></template>
            </Button>
            <Button v-if="capabilities.includes(Capability.MopDockCleanManualTrigger)" :label="dockState === 'cleaning' ? $t('Stop mop cleaning') : $t('Clean mop')" outlined :disabled="dockMutation.isPending.value || !canClean" @click="dockMutation.mutate(dockState === 'cleaning' ? 'stop_clean' : 'clean')">
                <template #icon><HomeDockActionIcon :action="dockState === 'cleaning' ? 'stop' : 'wash'" /></template>
            </Button>
            <Button v-if="capabilities.includes(Capability.MopDockDryManualTrigger)" :label="dockState === 'drying' ? $t('Stop mop drying') : $t('Dry mop')" outlined :disabled="dockMutation.isPending.value || !canDry" @click="dockMutation.mutate(dockState === 'drying' ? 'stop_dry' : 'dry')">
                <template #icon><HomeDockActionIcon :action="dockState === 'drying' ? 'stop' : 'dry'" /></template>
            </Button>
        </div>
        <Message v-if="dockMutation.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
    </div>
</template>

<style scoped>
.home-details { display: grid; gap: 10px; padding-top: 16px; border-top: 1px solid var(--app-border); }
.stat-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 12px; margin: 0; }
.stat-list div { display: flex; flex-direction: column-reverse; justify-content: flex-end; gap: 2px; }
.stat-list dt { color: var(--app-muted); font-size: var(--text-xs); }
.stat-list dd { margin: 0; font-size: var(--text-base); font-weight: 700; }
.dock-actions { display: grid; gap: 8px; margin-top: 6px; }
.dock-actions :deep(.p-button) { justify-content: flex-start; width: 100%; }
.dock-actions :deep(.p-button-label) { white-space: normal; text-align: left; }
.dock-actions :deep(.home-dock-action-icon) { flex: 0 0 18px; width: 18px; height: 18px; }
</style>
