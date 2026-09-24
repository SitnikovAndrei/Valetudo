<script setup lang="ts">
import {computed} from "vue";
import {useRoute, useRouter} from "vue-router";
import {Capability} from "../api/types";
import {duststreamConfigurationQuery} from "../api/queries";
import {useQuery} from "@tanstack/vue-query";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import {translate} from "../i18n";
import PageHeader from "../components/PageHeader.vue";
import SettingsSection from "../components/SettingsSection.vue";
import SettingRow from "../components/SettingRow.vue";
import AsyncState from "../components/AsyncState.vue";
import PresetSettings from "../components/PresetSettings.vue";
import DoNotDisturbSettings from "../components/DoNotDisturbSettings.vue";
import PreferenceSelects from "../components/PreferenceSelects.vue";
import AppIcon from "../components/AppIcon.vue";

type Category = "cleaning" | "map" | "connectivity" | "robot" | "valetudo";
type Link = {label: string; to: string; capability?: Capability; anyCapability?: Capability[]};
const props = defineProps<{capabilities: Capability[]}>();
const route = useRoute();
const router = useRouter();
const {query: attributes} = useRobotAttributes();
const duststream = useQuery({...duststreamConfigurationQuery, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
const categories = computed<{key: Category; label: string}[]>(() => [
    {key: "cleaning", label: translate("Cleaning")},
    {key: "map", label: translate("Map")},
    {key: "connectivity", label: translate("Connectivity")},
    {key: "robot", label: translate("Robot")},
    {key: "valetudo", label: translate("Valetudo")}
]);
const active = computed<Category>(() => categories.value.some(category => category.key === route.query.section) ? route.query.section as Category : "cleaning");
const hasPresets = computed(() => props.capabilities.some(capability => [Capability.FanSpeedControl, Capability.WaterUsageControl, Capability.OperationModeControl].includes(capability)));
const systemOptions = [Capability.SpeakerVolumeControl, Capability.SpeakerTest, Capability.VoicePackManagement];
const links = computed<Record<Exclude<Category, "cleaning">, Link[]>>(() => ({
    map: [
        {label: translate("Map options"), to: "/options/map_management"},
        {label: translate("Segment management"), to: "/options/map_management/segments", anyCapability: [Capability.MapSegmentEdit, Capability.MapSegmentRename, Capability.MapSegmentMaterialControl]},
        {label: translate("Virtual restrictions"), to: "/options/map_management/virtual_restrictions", capability: Capability.CombinedVirtualRestrictions},
        {label: translate("Map annotations"), to: "/options/map_management/annotations", capability: Capability.MapAnnotations},
        {label: translate("Robot coverage map"), to: "/options/map_management/robot_coverage"}
    ],
    connectivity: [
        {label: translate("HTTP Basic Auth"), to: "/options/connectivity/auth"},
        {label: translate("MQTT"), to: "/options/connectivity/mqtt"},
        {label: translate("Network advertisement"), to: "/options/connectivity/networkadvertisement"},
        {label: translate("NTP"), to: "/options/connectivity/ntp"},
        {label: translate("Wi-Fi"), to: "/options/connectivity/wifi", capability: Capability.WifiConfiguration}
    ],
    robot: [
        {label: translate("Robot options"), to: "/options/robot"},
        {label: translate("Statistics"), to: "/robot/total_statistics", capability: Capability.TotalStatistics},
        {label: translate("Consumables"), to: "/robot/consumables", capability: Capability.ConsumableMonitoring},
        ...(props.capabilities.includes(Capability.ManualControl) || props.capabilities.includes(Capability.HighResolutionManualControl) ? [{label: translate("Manual control"), to: "/robot/manual_control"}] : []),
        ...(props.capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled ? [{label: translate("Camera"), to: "/robot/camera"}] : []),
        {label: translate("System options"), to: "/options/robot/system", anyCapability: systemOptions},
        {label: translate("Quirks"), to: "/options/robot/quirks", capability: Capability.Quirks}
    ],
    valetudo: [
        {label: translate("Valetudo options"), to: "/options/valetudo"},
        {label: translate("Updater"), to: "/valetudo/updater"},
        {label: translate("System information"), to: "/valetudo/system_information"},
        {label: translate("Log"), to: "/valetudo/log"},
        {label: translate("AI Assistant"), to: "/valetudo/ai"},
        {label: translate("Help"), to: "/valetudo/help"},
        {label: translate("About"), to: "/valetudo/about"}
    ]
}));
const visibleLinks = computed(() => active.value === "cleaning" ? [] : links.value[active.value].filter(link =>
    (!link.capability || props.capabilities.includes(link.capability)) && (!link.anyCapability || link.anyCapability.some(capability => props.capabilities.includes(capability)))));
function select(category: Category) {void router.replace({path: "/options", query: category === "cleaning" ? {} : {section: category}});}
</script>

<template>
    <div class="settings-page">
        <PageHeader :title='$t("Settings")' :subtitle='$t("Settings are grouped by task and shown when supported by the robot.")' :kicker='$t("Robot")' />
        <div class="settings-layout">
            <nav class="settings-categories" :aria-label='$t("Settings")'>
                <button v-for="category in categories" :key="category.key" type="button" :aria-current="active === category.key ? 'page' : undefined" @click="select(category.key)">{{ category.label }}</button>
            </nav>
            <div class="settings-main">
                <template v-if="active === 'cleaning'">
                    <SettingsSection :title='$t("Cleaning")' :description='$t("Choose the available cleaning modes and schedules.")'>
                        <AsyncState v-if="hasPresets" :loading="attributes.isPending.value" :error="attributes.isError.value" :error-text='$t("Unable to load robot state.")' @retry="attributes.refetch()">
                            <PresetSettings :capabilities="capabilities" :attributes="attributes.data.value ?? []" />
                        </AsyncState>
                        <SettingRow :name='$t("Timers")' :description='$t("Create and manage cleaning schedules")'><RouterLink class="link-button" to="/valetudo/timers">{{ $t("Open") }}<AppIcon name="chevron-right" /></RouterLink></SettingRow>
                    </SettingsSection>
                    <DoNotDisturbSettings v-if="capabilities.includes(Capability.DoNotDisturb)" />
                </template>
                <SettingsSection v-else :title="categories.find(category => category.key === active)?.label ?? ''">
                    <div class="settings-link-grid">
                        <RouterLink v-for="link in visibleLinks" :key="link.to" class="nav-card" :to="link.to"><strong>{{ link.label }}</strong><AppIcon name="chevron-right" /></RouterLink>
                    </div>
                </SettingsSection>
                <SettingsSection v-if="active === 'valetudo'" class="settings-mobile-preferences" :title='$t("Preferences")'>
                    <PreferenceSelects layout="rows" />
                </SettingsSection>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-page { max-width: 1050px; }
.settings-layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 20px; }
.settings-categories { display: grid; align-content: start; gap: 4px; }
.settings-categories button { min-height: 42px; padding: 8px 12px; border: 0; border-radius: 9px; background: transparent; color: var(--app-secondary); font-weight: 600; text-align: left; cursor: pointer; }
.settings-categories button:hover, .settings-categories button[aria-current="page"] { background: var(--app-accent-soft); color: var(--app-accent); }
.settings-main { display: grid; align-content: start; gap: 16px; min-width: 0; }
.settings-link-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.settings-mobile-preferences { display: none; }

@media (max-width: 1100px) {
    .settings-layout { grid-template-columns: 150px minmax(0, 1fr); }
}
@media (max-width: 700px) {
    .settings-layout { display: block; }
    .settings-categories { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 14px; }
    .settings-categories button { font-size: var(--text-sm); text-align: center; }
    .settings-link-grid { grid-template-columns: 1fr; }
    .settings-mobile-preferences { display: block; }
}
</style>
