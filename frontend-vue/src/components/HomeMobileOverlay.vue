<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import Message from "primevue/message";
import {Capability} from "../api/types";
import type {BatteryState, RobotAttribute, StatusState} from "../api/RawRobotState";
import {fetchCurrentStatistics, fetchQuirks, sendSetQuirkValueCommand} from "../api/client";
import type {MapCleaning} from "../composables/useMapCleaning";
import type {BasicControl} from "../composables/useBasicControl";
import {useMapSelectionSummary} from "../composables/useMapSelectionSummary";
import {useDockActions} from "../composables/useDockActions";
import {homePrimaryAction} from "../homePrimaryAction";
import {quirkKind} from "../quirkKind";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import {formatStatisticsValue} from "../statistics";
import AppIcon from "./AppIcon.vue";
import HomeCommandIcon from "./HomeCommandIcon.vue";
import CleaningModePicker from "./CleaningModePicker.vue";
import PresetSettings from "./PresetSettings.vue";

const props = defineProps<{
    capabilities: Capability[];
    attributes: RobotAttribute[];
    status?: StatusState;
    batteries: BatteryState[];
    cleaning: MapCleaning;
    control: BasicControl;
    mapAvailable: boolean;
    attributesError: boolean;
}>();
defineEmits<{fit: []}>();
const cleaning = props.cleaning;
const control = props.control;
const summary = useMapSelectionSummary(cleaning);
const settingsOpen = ref(false);
const dockOpen = ref(false);
const hasBasic = computed(() => props.capabilities.includes(Capability.BasicControl));
const hasPresets = computed(() => props.capabilities.some(capability => [Capability.FanSpeedControl, Capability.WaterUsageControl, Capability.OperationModeControl, Capability.CleanRouteControl].includes(capability)));
const showStatistics = computed(() => props.capabilities.includes(Capability.CurrentStatistics) && !!props.status && !["idle", "docked"].includes(props.status.value));
const statistics = useQuery({queryKey: ["currentStatistics"], queryFn: fetchCurrentStatistics, enabled: showStatistics, refetchInterval: computed(() => showStatistics.value ? 10000 : false)});
const currentStatistics = computed(() => (statistics.data.value ?? []).filter(stat => stat.type === "area" || stat.type === "time"));
const primary = computed(() => homePrimaryAction(props.status, cleaning.mode.value));
const primaryLabel = computed(() => {
    if (primary.value === "selection") return cleaning.actionLabel.value;
    if (primary.value === "start" && props.status?.value === "paused") return translate("Resume");
    return translate(control.label(primary.value));
});
const busy = computed(() => control.command.isPending.value || cleaning.action.isPending.value);
const primaryDisabled = computed(() => props.attributesError || busy.value || (primary.value === "selection" ? cleaning.actionDisabled.value : !hasBasic.value || !control.enabled(primary.value)));
function executePrimary() {
    if (primaryDisabled.value) return;
    if (primary.value === "selection") cleaning.execute();
    else control.send(primary.value);
}

const {actions, hasDockActions, dockMutation} = useDockActions({capabilities: () => props.capabilities, attributes: () => props.attributes});
const quirks = useQuery({queryKey: ["quirks"], queryFn: fetchQuirks, enabled: computed(() => props.capabilities.includes(Capability.Quirks))});
const actionQuirks = computed(() => props.capabilities.includes(Capability.Quirks) ? (quirks.data.value ?? []).filter(quirk => quirkKind(quirk.options) === "action") : []);
const queryClient = useQueryClient();
const setQuirk = useMutation({mutationFn: sendSetQuirkValueCommand, onSuccess: () => queryClient.invalidateQueries({queryKey: ["quirks"]})});
</script>

<template>
    <div class="home-mobile-overlay">
        <div class="mobile-status">
            <strong>{{ status ? valueLabel(status.value) : $t("Loading…") }}</strong>
            <div class="mobile-status-detail">
                <span v-if="batteries.length">{{ Math.round(batteries[0].level) }}%</span>
                <template v-if="showStatistics"><span v-for="stat in currentStatistics" :key="stat.type">{{ formatStatisticsValue(stat) }}</span></template>
            </div>
            <small v-if="attributesError || (showStatistics && statistics.isError.value)">{{ attributesError ? $t("Command failed. Check the robot state and try again.") : $t("Unable to load current statistics.") }}</small>
        </div>
        <div class="mobile-tools">
            <button v-if="hasPresets" type="button" @click="settingsOpen = true"><AppIcon name="settings" /><span>{{ $t("Mode") }}</span></button>
            <button v-if="hasDockActions || actionQuirks.length" type="button" @click="dockOpen = true"><AppIcon name="whole-home" /><span>{{ $t("Dock station") }}</span></button>
            <button type="button" :disabled="!mapAvailable" :aria-label='$t("Fit map")' @click="$emit('fit')"><AppIcon name="fit" /><span>{{ $t("Fit") }}</span></button>
        </div>
        <div class="mobile-bottom">
            <CleaningModePicker :modes="cleaning.modes.value" :model-value="cleaning.mode.value" :map-available="mapAvailable" @update:model-value="cleaning.setMode" />
            <p class="mobile-selection" :title="summary.hint">{{ summary.hint }}</p>
            <div class="mobile-command-row">
                <Button v-if="hasBasic" class="mobile-command" rounded outlined :aria-label='$t(control.label("stop"))' :title='$t(control.label("stop"))' :disabled="busy || !control.enabled('stop')" :loading="control.running('stop')" @click="control.send('stop')"><template #icon><HomeCommandIcon action="stop" /></template></Button>
                <div class="mobile-primary">
                    <Button class="mobile-command mobile-command-primary" rounded :aria-label="primaryLabel" :title="primaryLabel" :disabled="primaryDisabled" :loading="busy" @click="executePrimary"><template #icon><HomeCommandIcon :action="primary === 'pause' ? 'pause' : 'start'" /></template></Button>
                    <span>{{ primaryLabel }}</span>
                </div>
                <Button v-if="hasBasic" class="mobile-command" rounded outlined :aria-label='$t(control.label("home"))' :title='$t(control.label("home"))' :disabled="busy || !control.enabled('home')" :loading="control.running('home')" @click="control.send('home')"><template #icon><HomeCommandIcon action="home" /></template></Button>
            </div>
            <Message v-if="control.command.isError.value || cleaning.action.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
            <Message v-if="cleaning.mode.value === 'segments' && cleaning.segmentation.isError.value" severity="error">{{ $t("Unable to load segment limits.") }}</Message>
            <Message v-if="cleaning.mode.value === 'zones' && cleaning.zoneProperties.isError.value" severity="error">{{ $t("Unable to load zone limits.") }}</Message>
        </div>
    </div>
    <Drawer v-model:visible="settingsOpen" position="bottom" :header='$t("Cleaning settings")' class="home-mobile-sheet">
        <PresetSettings :capabilities="capabilities" :attributes="attributes" compact variant="segmented" />
    </Drawer>
    <Drawer v-model:visible="dockOpen" position="bottom" :header='$t("Dock station")' class="home-mobile-sheet">
        <div class="mobile-dock-actions">
            <Button v-for="action in actions" :key="action.id" :label="$t(action.label)" outlined :disabled="attributesError || !action.enabled || dockMutation.isPending.value" :loading="dockMutation.isPending.value && dockMutation.variables.value === action.id" @click="dockMutation.mutate(action.id)" />
            <Button v-for="quirk in actionQuirks" :key="quirk.id" :label="$t(quirk.title)" outlined :disabled="setQuirk.isPending.value" :loading="setQuirk.isPending.value && setQuirk.variables.value?.id === quirk.id" @click="setQuirk.mutate({id: quirk.id, value: 'trigger'})" />
            <Message v-if="dockMutation.isError.value || setQuirk.isError.value" severity="error">{{ $t("A robot control request failed.") }}</Message>
            <Message v-if="capabilities.includes(Capability.Quirks) && quirks.isError.value" severity="error">{{ $t("Unable to load or save quirks.") }}</Message>
        </div>
    </Drawer>
</template>

<style scoped>
.home-mobile-overlay { position: absolute; z-index: 2; inset: 0; pointer-events: none; }
.mobile-status, .mobile-tools button, .mobile-bottom > * { pointer-events: auto; }
.mobile-status { position: absolute; top: 12px; left: 12px; max-width: calc(100% - 100px); padding: 10px 14px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface); color: var(--app-text); box-shadow: var(--app-shadow); }
.mobile-status-detail { display: flex; flex-wrap: wrap; gap: 10px; color: var(--app-muted); font-size: var(--text-xs); }
.mobile-tools { position: absolute; top: 12px; right: 12px; display: grid; gap: 10px; }
.mobile-tools button { display: grid; place-items: center; gap: 2px; min-width: 56px; min-height: 56px; padding: 6px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface); color: var(--app-text); font-size: var(--text-xs); box-shadow: var(--app-shadow); cursor: pointer; }
.mobile-tools .app-icon { width: 22px; height: 22px; }
.mobile-tools button:disabled { opacity: .5; cursor: default; }
.mobile-bottom { position: absolute; bottom: 0; left: 0; right: 0; display: grid; gap: 6px; padding: 12px 14px 10px; }
.mobile-bottom :deep(.mode-picker) { grid-template-columns: repeat(var(--mode-count), minmax(0, 1fr)); gap: 2px; padding: 4px; border: 1px solid var(--app-border); border-radius: 28px; background: var(--app-surface); }
.mobile-bottom :deep(.mode-picker button) { min-height: 44px; border: 0; border-radius: 24px; font-size: var(--text-xs); }
.mobile-bottom :deep(.mode-picker .app-icon) { display: none; }
.mobile-selection { margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; font-size: var(--text-xs); color: var(--app-muted); border-radius: var(--radius-sm); background: var(--app-surface); }
.mobile-command-row { display: flex; justify-content: center; align-items: flex-start; gap: 28px; pointer-events: none; }
.mobile-command { width: 48px; height: 48px; margin-top: 10px; background: var(--app-surface); color: var(--app-text); border-color: var(--app-border); pointer-events: auto; }
.mobile-primary { display: grid; justify-items: center; gap: 4px; max-width: 160px; }
.mobile-primary span { padding: 2px 8px; border-radius: var(--radius-sm); background: var(--app-surface); color: var(--app-text); font-size: var(--text-xs); text-align: center; }
.mobile-command-primary { width: 68px; height: 68px; margin: 0; background: var(--app-accent); border-color: var(--app-accent); color: var(--app-on-accent); }
.mobile-command :deep(svg) { width: 24px; height: 24px; }
.mobile-dock-actions { display: grid; gap: 12px; }
.mobile-dock-actions :deep(.p-button) { width: 100%; min-height: 44px; justify-content: flex-start; }
.mobile-dock-actions :deep(.p-button-label) { white-space: normal; text-align: left; }
@media (min-width: 701px) {
    .home-mobile-overlay { display: none; }
}
</style>

<style>
.home-mobile-sheet.p-drawer { height: auto; max-height: 70dvh; border-radius: var(--radius-lg) var(--radius-lg) 0 0; background: var(--app-surface); color: var(--app-text); border-color: var(--app-border); padding-bottom: env(safe-area-inset-bottom); }
.home-mobile-sheet .p-drawer-content { overflow-y: auto; overscroll-behavior: contain; }
</style>
