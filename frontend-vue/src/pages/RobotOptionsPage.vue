<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability, type AutoEmptyDockAutoEmptyDuration, type AutoEmptyDockAutoEmptyInterval, type CarpetSensorMode, type CleanRoute, type CleanRouteControlProperties, type MopDockMopDryingDuration, type MopDockMopDryingTimeControlProperties, type MopDockMopWashTemperature} from "../api/types";
import {
    fetchAutoEmptyDockAutoEmptyDuration, fetchAutoEmptyDockAutoEmptyDurationControlProperties,
    fetchAutoEmptyDockAutoEmptyInterval, fetchAutoEmptyDockAutoEmptyIntervalProperties,
    fetchCameraLightControlState, fetchCarpetModeState, fetchCollisionAvoidantNavigationControlState,
    fetchCarpetSensorMode, fetchCarpetSensorModeProperties, fetchCleanRoute, fetchCleanRouteControlProperties,
    fetchFloorMaterialDirectionAwareNavigationControlState, fetchKeyLockState, fetchMopDockMopAutoDryingControlState,
    fetchMopDockMopDryingTime, fetchMopDockMopDryingTimeControlProperties,
    fetchMopDockMopWashTemperature, fetchMopDockMopWashTemperatureProperties,
    fetchMopExtensionControlState, fetchMopExtensionFurnitureLegHandlingControlState, fetchMopTwistControlState,
    fetchObstacleAvoidanceControlState, fetchObstacleImagesState, fetchPetObstacleAvoidanceControlState,
    sendAutoEmptyDockAutoEmptyDuration, sendAutoEmptyDockAutoEmptyInterval,
    sendCameraLightControlState, sendCarpetModeEnable, sendCarpetSensorMode, sendCleanRoute, sendCollisionAvoidantNavigationControlState,
    sendFloorMaterialDirectionAwareNavigationControlState, sendKeyLockEnable, sendLocateCommand,
    sendMopDockMopAutoDryingControlState, sendMopDockMopDryingTime, sendMopDockMopWashTemperature, sendMopExtensionControlState,
    sendMopExtensionFurnitureLegHandlingControlState, sendMopTwistControlState,
    sendObstacleAvoidanceControlState, sendObstacleImagesState, sendPetObstacleAvoidanceControlState
} from "../api/client";
import ToggleSetting from "../components/ToggleSetting.vue";
import SelectSetting from "../components/SelectSetting.vue";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";
import SettingsSection from "../components/SettingsSection.vue";
import SettingRow from "../components/SettingRow.vue";
import AppIcon from "../components/AppIcon.vue";

const props = defineProps<{capabilities: Capability[]}>();
const cleanRouteProperties = ref<CleanRouteControlProperties>();
const mopDryingProperties = ref<MopDockMopDryingTimeControlProperties>();
const cleanRouteDescription = computed(() => {
    const details = [translate("Trade speed for thoroughness and vice-versa.")];
    if (cleanRouteProperties.value?.mopOnly.length) {
        details.push(translate("Mop-only routes: {routes}.", {routes: cleanRouteProperties.value.mopOnly.map(valueLabel).join(", ")}));
    }
    if (cleanRouteProperties.value?.oneTime.length) {
        details.push(translate("One-time routes: {routes}.", {routes: cleanRouteProperties.value.oneTime.map(valueLabel).join(", ")}));
    }
    return details.join(" ");
});
const mopDryingDescription = computed(() => [
    translate("Select how long the mop should be dried with hot air after a cleanup."),
    ...(mopDryingProperties.value?.supportedDurations.includes("cold") ? [translate('"Cold" disables the heater and compensates with far longer runtimes.')] : [])
].join(" "));
const settings = computed(() => [
    {group: "Other", capability: Capability.KeyLock, name: translate("Lock keys"), description: translate("Prevents the robot from being operated using its physical buttons."), fetchState: fetchKeyLockState, updateState: sendKeyLockEnable},
    {group: "Cleaning", capability: Capability.CarpetModeControl, name: translate("Carpet mode"), description: translate("When enabled, the vacuum will recognize carpets automatically and increase the suction."), fetchState: fetchCarpetModeState, updateState: sendCarpetModeEnable},
    {group: "Obstacles", capability: Capability.ObstacleAvoidanceControl, name: translate("Obstacle avoidance"), description: translate("Avoid obstacles using sensors such as lasers or cameras. May suffer from false positives."), fetchState: fetchObstacleAvoidanceControlState, updateState: sendObstacleAvoidanceControlState},
    {group: "Obstacles", capability: Capability.PetObstacleAvoidanceControl, name: translate("Pet obstacle avoidance"), description: translate("Fine-tune obstacle avoidance to avoid obstacles left by pets. Will increase the general false positive rate."), fetchState: fetchPetObstacleAvoidanceControlState, updateState: sendPetObstacleAvoidanceControlState},
    {group: "Cleaning", capability: Capability.CollisionAvoidantNavigation, name: translate("Collision avoidant navigation"), description: translate("Drive a more conservative route to reduce collisions. May cause missed spots."), fetchState: fetchCollisionAvoidantNavigationControlState, updateState: sendCollisionAvoidantNavigationControlState},
    {group: "Mop", capability: Capability.MopExtensionControl, name: translate("Mop extension"), description: translate("Extend the mop outwards to reach closer to walls and furniture."), fetchState: fetchMopExtensionControlState, updateState: sendMopExtensionControlState},
    {group: "Mop", capability: Capability.MopTwistControl, name: translate("Mop twist"), description: props.capabilities.includes(Capability.MopExtensionControl) ? translate("With the mop extended, twist the robot to further reach below furniture and other overhangs.") : translate("Twist the robot to mop closer to walls and furniture. Will increase the cleanup duration."), fetchState: fetchMopTwistControlState, updateState: sendMopTwistControlState},
    {group: "Mop", capability: Capability.MopExtensionFurnitureLegHandlingControl, name: translate("Furniture leg handling"), description: translate("Use the extending mop to mop up close to legs of chairs and tables."), fetchState: fetchMopExtensionFurnitureLegHandlingControlState, updateState: sendMopExtensionFurnitureLegHandlingControlState},
    {group: "Obstacles", capability: Capability.CameraLightControl, name: translate("Camera light"), description: translate("Illuminate the dark to improve the AI image recognition obstacle avoidance."), fetchState: fetchCameraLightControlState, updateState: sendCameraLightControlState},
    {group: "Obstacles", capability: Capability.ObstacleImages, name: translate("Obstacle images"), description: translate("Take pictures of all encountered obstacles."), fetchState: fetchObstacleImagesState, updateState: sendObstacleImagesState},
    {group: "Cleaning", capability: Capability.FloorMaterialDirectionAwareNavigationControl, name: translate("Floor direction aware navigation"), description: translate("Clean along the direction of the configured/detected floor material (if applicable)."), fetchState: fetchFloorMaterialDirectionAwareNavigationControlState, updateState: sendFloorMaterialDirectionAwareNavigationControlState},
    {group: "Dock", capability: Capability.MopDockMopAutoDryingControl, name: translate("Automatic mop drying"), description: translate("Automatically dry the mop pads after a cleanup."), fetchState: fetchMopDockMopAutoDryingControlState, updateState: sendMopDockMopAutoDryingControlState}
]);
const selections = computed(() => [
    {group: "Cleaning", capability: Capability.CarpetSensorModeControl, name: translate("Carpet sensor"), description: translate("Select what action the robot should take if it detects carpet while mopping."), fetchValue: fetchCarpetSensorMode, fetchOptions: async () => (await fetchCarpetSensorModeProperties()).supportedModes, updateValue: (value: string) => sendCarpetSensorMode({mode: value as CarpetSensorMode})},
    {group: "Cleaning", capability: Capability.CleanRouteControl, name: translate("Clean route"), description: cleanRouteDescription.value, fetchValue: fetchCleanRoute, fetchOptions: async () => {const properties = await fetchCleanRouteControlProperties(); cleanRouteProperties.value = properties; return properties.supportedRoutes;}, updateValue: (value: string) => sendCleanRoute({route: value as CleanRoute})},
    {group: "Dock", capability: Capability.AutoEmptyDockAutoEmptyIntervalControl, name: translate("Dock auto-empty"), description: translate("Select if and/or how often the dock should auto-empty the robot."), fetchValue: fetchAutoEmptyDockAutoEmptyInterval, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyIntervalProperties()).supportedIntervals, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyInterval({interval: value as AutoEmptyDockAutoEmptyInterval})},
    {group: "Dock", capability: Capability.AutoEmptyDockAutoEmptyDurationControl, name: translate("Auto-empty duration"), description: translate("Configure the duration of the auto-empty cycle."), fetchValue: fetchAutoEmptyDockAutoEmptyDuration, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyDurationControlProperties()).supportedDurations, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyDuration({duration: value as AutoEmptyDockAutoEmptyDuration})},
    {group: "Dock", capability: Capability.MopDockMopWashTemperatureControl, name: translate("Mop wash temperature"), description: translate("Select if and/or how much the dock should heat the water used to rinse the mop pads."), fetchValue: fetchMopDockMopWashTemperature, fetchOptions: async () => (await fetchMopDockMopWashTemperatureProperties()).supportedTemperatures, updateValue: (value: string) => sendMopDockMopWashTemperature({temperature: value as MopDockMopWashTemperature})},
    {group: "Dock", capability: Capability.MopDockMopDryingTimeControl, name: translate("Mop drying time"), description: mopDryingDescription.value, fetchValue: fetchMopDockMopDryingTime, fetchOptions: async () => {const properties = await fetchMopDockMopDryingTimeControlProperties(); mopDryingProperties.value = properties; return properties.supportedDurations;}, updateValue: (value: string) => sendMopDockMopDryingTime({duration: value as MopDockMopDryingDuration})}
]);
const groups = computed(() => [
    {key: "Cleaning", title: translate("Cleaning")},
    {key: "Obstacles", title: translate("Obstacles")},
    {key: "Mop", title: translate("Mop")},
    {key: "Dock", title: translate("Dock station")},
    {key: "Other", title: translate("Other")}
].map(group => ({
    ...group,
    toggles: settings.value.filter(setting => setting.group === group.key && props.capabilities.includes(setting.capability)),
    selections: selections.value.filter(setting => setting.group === group.key && props.capabilities.includes(setting.capability)),
    locate: group.key === "Other" && props.capabilities.includes(Capability.Locate)
})).filter(group => group.toggles.length || group.selections.length || group.locate));
const systemOptionsSupported = computed(() => props.capabilities.some(capability => [Capability.SpeakerVolumeControl, Capability.SpeakerTest, Capability.VoicePackManagement].includes(capability)));
const locate = useMutation({mutationFn: sendLocateCommand});
</script>

<template>
    <div class="page max-w-3xl">
        <PageHeader :title="$t('Robot options')" :subtitle="$t('Controls available on this robot')" />
        <SettingsSection v-for="group in groups" :key="group.key" :title="group.title" class="mb-4">
            <ToggleSetting v-for="setting in group.toggles" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-state="setting.fetchState" :update-state="setting.updateState" />
            <SelectSetting v-for="setting in group.selections" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-value="setting.fetchValue" :fetch-options="setting.fetchOptions" :update-value="setting.updateValue" />
            <SettingRow v-if="group.locate" :name='$t("Locate robot")' :description='$t("The robot will play a sound to announce its location")'>
                <Button :label='$t("Locate robot")' outlined :loading="locate.isPending.value" @click="locate.mutate()" />
                <Message v-if="locate.isError.value" severity="error" class="mt-2">{{ $t("Unable to locate robot.") }}</Message>
            </SettingRow>
        </SettingsSection>
        <SettingsSection v-if="capabilities.includes(Capability.Quirks) || systemOptionsSupported" :title='$t("More settings")'>
            <SettingRow v-if="capabilities.includes(Capability.Quirks)" :name='$t("Quirks")' :description='$t("Configure firmware-specific quirks")'><RouterLink class="link-button" to="/options/robot/quirks">{{ $t("Open") }}<AppIcon name="chevron-right" /></RouterLink></SettingRow>
            <SettingRow v-if="systemOptionsSupported" :name='$t("System options")' :description='$t("Volume and voice packs")'><RouterLink class="link-button" to="/options/robot/system">{{ $t("Open") }}<AppIcon name="chevron-right" /></RouterLink></SettingRow>
        </SettingsSection>
    </div>
</template>
