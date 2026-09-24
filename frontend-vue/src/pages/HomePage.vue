<script setup lang="ts">
import {computed} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability} from "../api/types";
import {fetchRobotInformation} from "../api/client";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import {useRobotMap} from "../composables/useRobotMap";
import {useMapCleaning} from "../composables/useMapCleaning";
import {useBasicControl} from "../composables/useBasicControl";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";
import MapPanel from "../components/MapPanel.vue";
import CleaningModePicker from "../components/CleaningModePicker.vue";
import MapSelectionDetails from "../components/MapSelectionDetails.vue";
import BasicControls from "../components/BasicControls.vue";
import PresetSettings from "../components/PresetSettings.vue";
import RobotStatusCard from "../components/RobotStatusCard.vue";
import HomeCommandIcon from "../components/HomeCommandIcon.vue";
import AppIcon from "../components/AppIcon.vue";

const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const robot = useQuery({queryKey: ["robotInformation"], queryFn: fetchRobotInformation, retry: 1});
const {query: attributes, status, batteries} = useRobotAttributes();
const map = useRobotMap();
const cleaning = useMapCleaning({
    capabilities: () => props.capabilities,
    map: map.data,
    mapLoading: map.isPending,
    status: () => status.value
});
const control = useBasicControl({status: () => status.value, blocked: () => attributes.isError.value});
const {mode} = cleaning;

const hasBasicControl = computed(() => props.capabilities.includes(Capability.BasicControl));
const hasPresets = computed(() => props.capabilities.some(capability => [Capability.FanSpeedControl, Capability.WaterUsageControl, Capability.OperationModeControl].includes(capability)));
const roomNames = computed(() => cleaning.segments.value.map(segment => segment.name));
</script>

<template>
    <div class="home-page">
        <PageHeader class="home-header" :title='$t("Map and controls")' :subtitle='$t("Choose an area and an action for the current state.")' :kicker='$t("Robot vacuum")' />
        <section class="home-dashboard">
            <MapPanel class="home-map" :map="map.data.value" :loading="map.isPending.value" :error="map.isError.value" :palette-mode="paletteMode"
                :mode="mode === 'all' ? 'pan' : mode" :selected-segment-ids="cleaning.selectedSegmentIds.value" :zones="cleaning.zones.value" :target="cleaning.target.value" :room-names="roomNames"
                @segment-click="cleaning.toggleSegment" @zone-created="cleaning.addZone" @zone-remove="cleaning.removeZone" @point-selected="cleaning.selectPoint" @retry="map.refetch()" />

            <div class="panel home-actions">
                <div class="home-action-status">
                    <span class="status-dot" :class="status?.value" aria-hidden="true" />
                    <strong>{{ status ? valueLabel(status.value) : $t("Loading…") }}</strong>
                    <span>{{ robot.data.value?.modelName }}<template v-if="batteries.length"> · {{ Math.round(batteries[0].level) }}%</template></span>
                </div>
                <div>
                    <p class="kicker">{{ $t("Cleaning controls") }}</p>
                    <h2 class="home-actions-title">{{ $t("Where to clean?") }}</h2>
                </div>
                <CleaningModePicker :modes="cleaning.modes.value" :model-value="mode" :map-available="!!map.data.value" @update:model-value="cleaning.setMode" />
                <MapSelectionDetails :cleaning="cleaning" :map="map.data.value" />

                <div class="home-commands">
                    <Button v-if="mode !== 'all'" class="home-map-action" :label="cleaning.actionLabel.value" :disabled="cleaning.actionDisabled.value" :loading="cleaning.action.isPending.value" @click="cleaning.execute()">
                        <template #icon><HomeCommandIcon action="start" /></template>
                    </Button>
                    <BasicControls v-if="hasBasicControl" :control="control" layout="stack" :show-start="mode === 'all'" />
                </div>
                <Message v-if="control.command.isError.value" severity="error">{{ $t("Command failed. Check the robot state and try again.") }}</Message>
                <Message v-if="cleaning.action.isError.value" severity="error">{{ $t("Map action failed. Check the robot state and retry.") }}</Message>
                <Message v-if="cleaning.segmentation.isError.value && mode === 'segments'" severity="error">{{ $t("Unable to load segment limits.") }}</Message>
                <Message v-if="cleaning.zoneProperties.isError.value && mode === 'zones'" severity="error">{{ $t("Unable to load zone limits.") }}</Message>

                <div v-if="hasPresets" class="home-presets">
                    <PresetSettings :capabilities="capabilities" :attributes="attributes.data.value ?? []" compact />
                </div>
            </div>

            <RobotStatusCard class="home-status" :capabilities="capabilities" :status="status" :batteries="batteries" :attributes="attributes.data.value ?? []"
                :attributes-pending="attributes.isPending.value" :attributes-error="attributes.isError.value" />

            <RouterLink v-if="capabilities.includes(Capability.DoNotDisturb)" class="home-quiet-card" to="/options">
                <AppIcon name="moon" />
                <span><strong>{{ $t("Do not disturb") }}</strong><small>{{ $t("The behavior depends on the robot model.") }}</small></span>
                <AppIcon name="chevron-right" />
            </RouterLink>

            <div class="home-mobile-command">
                <Button v-if="mode !== 'all'" class="home-map-action" :label="cleaning.actionLabel.value" :disabled="cleaning.actionDisabled.value" :loading="cleaning.action.isPending.value" @click="cleaning.execute()">
                    <template #icon><HomeCommandIcon action="start" /></template>
                </Button>
                <BasicControls v-if="hasBasicControl" :control="control" layout="bar" :show-start="mode === 'all'" />
            </div>
        </section>

        <Dialog :visible="!!cleaning.requestedMode.value" modal :header='$t("Change cleaning area?")' class="max-w-md" @update:visible="value => {if (!value) cleaning.requestedMode.value = undefined;}">
            <p>{{ $t("The current map selection will be cleared.") }}</p>
            <div class="mt-5 flex justify-end gap-2">
                <Button :label='$t("Cancel")' text @click="cleaning.requestedMode.value = undefined" />
                <Button :label='$t("Change area")' @click="cleaning.confirmModeChange()" />
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.home-dashboard {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    grid-template-areas: "map actions" "map status" "map quiet";
    grid-template-rows: auto auto 1fr;
    gap: 16px;
    align-items: start;
}
.home-map { grid-area: map; position: sticky; top: 16px; }
.home-actions { grid-area: actions; display: grid; gap: 16px; padding: 18px; }
.home-status { grid-area: status; }
.home-quiet-card { grid-area: quiet; }

.home-action-status { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 12px; border-radius: var(--radius-sm); background: var(--app-accent-soft); color: var(--app-secondary); font-size: var(--text-xs); }
.home-action-status strong { color: var(--app-text); }
.home-action-status > span:last-child { overflow: hidden; margin-left: auto; white-space: nowrap; text-overflow: ellipsis; }
.home-actions-title { margin: 4px 0 0; font-size: var(--text-lg); line-height: 1.3; }
.home-commands { display: grid; gap: 8px; }
.home-commands :deep(.home-map-action) { width: 100%; min-height: 44px; justify-content: center; }
.home-presets { padding-top: 4px; border-top: 1px solid var(--app-border); }

.home-quiet-card { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 12px 16px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface-soft); color: var(--app-text); text-decoration: none; }
.home-quiet-card:hover { border-color: var(--app-accent); }
.home-quiet-card > :deep(.app-icon:first-child) { width: 22px; height: 22px; color: var(--app-accent); }
.home-quiet-card > :deep(.app-icon:last-child) { width: 18px; height: 18px; margin-left: auto; color: var(--app-muted); }
.home-quiet-card strong, .home-quiet-card small { display: block; }
.home-quiet-card strong { font-size: var(--text-sm); }
.home-quiet-card small { color: var(--app-muted); font-size: var(--text-xs); }

.home-mobile-command { display: none; }

/* Tablets: one column, controls directly under the map. */
@media (max-width: 1100px) {
    .home-dashboard { grid-template-columns: minmax(0, 1fr); grid-template-areas: "map" "actions" "status" "quiet"; grid-template-rows: none; }
    .home-map { position: static; }
}

/* Phones: header hidden, commands pinned above the tab bar in a single row. */
@media (max-width: 700px) {
    .home-header, .home-action-status { display: none; }
    .home-dashboard { gap: 12px; padding-bottom: calc(68px + env(safe-area-inset-bottom)); }
    .home-actions { margin-inline: -14px; padding: 16px 14px; border-inline: 0; border-radius: 0; }
    .home-commands { display: none; }
    .home-mobile-command {
        position: fixed; z-index: 29; right: 0; bottom: calc(60px + env(safe-area-inset-bottom)); left: 0;
        display: flex; align-items: center; gap: 6px; padding: 8px 14px;
        border-top: 1px solid var(--app-border); background: var(--app-surface); box-shadow: 0 -8px 20px rgb(0 0 0 / 5%);
    }
    .home-mobile-command :deep(.home-map-action) { flex: 1; min-width: 0; min-height: 44px; }
}
</style>
