<script setup lang="ts">
import Message from "primevue/message";
import {Capability} from "../api/types";
import type {RobotAttribute} from "../api/RawRobotState";
import {useDockActions} from "../composables/useDockActions";
import HomeDockActionIcon from "./HomeDockActionIcon.vue";

const props = defineProps<{capabilities: Capability[]; attributes: RobotAttribute[]}>();
const {hasDockActions, dockState, dockStatusLabel, unavailableReason, canEmpty, canClean, canDry, dockMutation} = useDockActions({capabilities: () => props.capabilities, attributes: () => props.attributes});
</script>

<template>
    <div v-if="hasDockActions" class="panel home-dock">
        <div class="home-dock-heading">
            <span class="kicker">{{ $t("Dock station") }}</span>
            <span v-if="dockStatusLabel" class="home-dock-status" :class="`home-dock-status--${dockState}`" role="status">{{ $t(dockStatusLabel) }}</span>
        </div>
        <div class="dock-actions">
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
        <p v-if="unavailableReason" class="home-dock-hint">{{ $t(unavailableReason) }}</p>
        <Message v-if="dockMutation.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
    </div>
</template>

<style scoped>
.home-dock { display: grid; gap: 10px; padding: 18px; }
.home-dock-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.home-dock-heading .kicker { margin: 0; }
.home-dock-status { padding: 3px 10px; border-radius: 999px; background: var(--app-surface-raised); color: var(--app-secondary); font-size: var(--text-xs); font-weight: 600; }
.home-dock-status--emptying, .home-dock-status--cleaning, .home-dock-status--drying { background: var(--app-accent-soft); color: var(--app-accent); }
.home-dock-status--pause { background: var(--status-paused-bg); color: var(--status-paused-text); }
.home-dock-status--error { background: var(--status-error-bg); color: var(--status-error-text); }
.home-dock-hint { margin: 0; color: var(--app-muted); font-size: var(--text-xs); }
.dock-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; }
.dock-action { display: grid; justify-items: center; align-content: center; gap: 6px; min-width: 0; min-height: 76px; padding: 10px 6px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface-soft); color: var(--app-text); font: inherit; font-size: var(--text-xs); line-height: 1.25; text-align: center; cursor: pointer; }
.dock-action:hover:not(:disabled) { border-color: var(--app-accent); color: var(--app-accent); }
.dock-action--active { border-color: var(--app-accent); background: var(--app-accent-soft); color: var(--app-accent); }
.dock-action:disabled { opacity: .5; cursor: default; }
.dock-action :deep(.home-dock-action-icon) { width: 24px; height: 24px; color: var(--app-accent); }
</style>
