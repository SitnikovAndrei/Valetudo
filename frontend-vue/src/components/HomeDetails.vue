<script setup lang="ts">
import {computed} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Message from "primevue/message";
import {Capability, type ValetudoDataPoint} from "../api/types";
import {RobotAttributeClass, type RobotAttribute} from "../api/RawRobotState";
import {fetchCurrentStatistics, fetchTotalStatistics} from "../api/client";
import {translate} from "../i18n";
import {formatStatisticsValue} from "../statistics";
import {useDockActions} from "../composables/useDockActions";
import HomeDockActionIcon from "./HomeDockActionIcon.vue";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]}>();
const robotState = computed(() => props.attributes.find(attribute => attribute.__class === RobotAttributeClass.StatusState)?.value);
const hasTotalStatistics = computed(() => props.capabilities.includes(Capability.TotalStatistics));
const {hasDockActions, dockState, canEmpty, canClean, canDry, dockMutation} = useDockActions({capabilities: () => props.capabilities, attributes: () => props.attributes});
const showCurrentStatistics = computed(() => !hasTotalStatistics.value && props.capabilities.includes(Capability.CurrentStatistics) && robotState.value !== undefined && !["idle", "docked"].includes(robotState.value));
const showStatistics = computed(() => hasTotalStatistics.value || showCurrentStatistics.value);
const totalStats = useQuery({queryKey: ["totalStatistics"], queryFn: fetchTotalStatistics, enabled: hasTotalStatistics});
const currentStats = useQuery({queryKey: ["currentStatistics"], queryFn: fetchCurrentStatistics, enabled: showCurrentStatistics});
const statisticsOrder = {time: 0, area: 1, count: 2};
const statistics = computed(() => [...(hasTotalStatistics.value ? totalStats.data.value ?? [] : currentStats.data.value ?? [])].sort((a, b) => statisticsOrder[a.type] - statisticsOrder[b.type]));
const statisticsPending = computed(() => hasTotalStatistics.value ? totalStats.isPending.value : currentStats.isPending.value);
const statisticsError = computed(() => hasTotalStatistics.value ? totalStats.isError.value : currentStats.isError.value);

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
            <button v-if="capabilities.includes(Capability.AutoEmptyDockManualTrigger)" type="button" class="dock-action" :title='$t("Empty dustbin")' :disabled="dockMutation.isPending.value || !canEmpty" @click="dockMutation.mutate('empty')">
                <HomeDockActionIcon action="empty" /><span>{{ $t("Empty dustbin") }}</span>
            </button>
            <button v-if="capabilities.includes(Capability.MopDockCleanManualTrigger)" type="button" class="dock-action" :class="{'dock-action--active': dockState === 'cleaning'}" :title="dockState === 'cleaning' ? $t('Stop mop cleaning') : $t('Clean mop')" :disabled="dockMutation.isPending.value || !canClean" @click="dockMutation.mutate(dockState === 'cleaning' ? 'stop_clean' : 'clean')">
                <HomeDockActionIcon :action="dockState === 'cleaning' ? 'stop' : 'wash'" /><span>{{ dockState === 'cleaning' ? $t("Stop mop cleaning") : $t("Clean mop") }}</span>
            </button>
            <button v-if="capabilities.includes(Capability.MopDockDryManualTrigger)" type="button" class="dock-action" :class="{'dock-action--active': dockState === 'drying'}" :title="dockState === 'drying' ? $t('Stop mop drying') : $t('Dry mop')" :disabled="dockMutation.isPending.value || !canDry" @click="dockMutation.mutate(dockState === 'drying' ? 'stop_dry' : 'dry')">
                <HomeDockActionIcon :action="dockState === 'drying' ? 'stop' : 'dry'" /><span>{{ dockState === 'drying' ? $t("Stop mop drying") : $t("Dry mop") }}</span>
            </button>
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
.dock-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; margin-top: 6px; }
.dock-action { display: grid; justify-items: center; align-content: center; gap: 6px; min-width: 0; min-height: 76px; padding: 10px 6px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface-soft); color: var(--app-text); font: inherit; font-size: var(--text-xs); line-height: 1.25; text-align: center; cursor: pointer; }
.dock-action:hover:not(:disabled) { border-color: var(--app-accent); color: var(--app-accent); }
.dock-action--active { border-color: var(--app-accent); background: var(--app-accent-soft); color: var(--app-accent); }
.dock-action:disabled { opacity: .5; cursor: default; }
.dock-action :deep(.home-dock-action-icon) { width: 24px; height: 24px; color: var(--app-accent); }
</style>
