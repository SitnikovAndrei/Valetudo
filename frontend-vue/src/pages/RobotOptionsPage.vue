<script setup lang="ts">
import {computed} from "vue";
import {useMutation} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability, type AutoEmptyDockAutoEmptyDuration, type AutoEmptyDockAutoEmptyInterval, type CarpetSensorMode, type CleanRoute, type MopDockMopDryingDuration, type MopDockMopWashTemperature} from "../../../frontend/src/api/types";
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
} from "../../../frontend/src/api/client";
import ToggleSetting from "../components/ToggleSetting.vue";
import SelectSetting from "../components/SelectSetting.vue";
import {translate} from "../i18n";

const props = defineProps<{capabilities: Capability[]}>();
const settings = computed(() => [
    {capability: Capability.KeyLock, name: translate("Lock keys"), description: translate("Prevents operation using the robot's physical buttons"), fetchState: fetchKeyLockState, updateState: sendKeyLockEnable},
    {capability: Capability.CarpetModeControl, name: translate("Carpet mode"), description: translate("Increase suction on carpet"), fetchState: fetchCarpetModeState, updateState: sendCarpetModeEnable},
    {capability: Capability.ObstacleAvoidanceControl, name: translate("Obstacle avoidance"), fetchState: fetchObstacleAvoidanceControlState, updateState: sendObstacleAvoidanceControlState},
    {capability: Capability.PetObstacleAvoidanceControl, name: translate("Pet obstacle avoidance"), fetchState: fetchPetObstacleAvoidanceControlState, updateState: sendPetObstacleAvoidanceControlState},
    {capability: Capability.CollisionAvoidantNavigation, name: translate("Collision avoidant navigation"), fetchState: fetchCollisionAvoidantNavigationControlState, updateState: sendCollisionAvoidantNavigationControlState},
    {capability: Capability.MopExtensionControl, name: translate("Mop extension"), fetchState: fetchMopExtensionControlState, updateState: sendMopExtensionControlState},
    {capability: Capability.MopTwistControl, name: translate("Mop twist"), fetchState: fetchMopTwistControlState, updateState: sendMopTwistControlState},
    {capability: Capability.MopExtensionFurnitureLegHandlingControl, name: translate("Furniture leg handling"), fetchState: fetchMopExtensionFurnitureLegHandlingControlState, updateState: sendMopExtensionFurnitureLegHandlingControlState},
    {capability: Capability.CameraLightControl, name: translate("Camera light"), fetchState: fetchCameraLightControlState, updateState: sendCameraLightControlState},
    {capability: Capability.ObstacleImages, name: translate("Obstacle images"), fetchState: fetchObstacleImagesState, updateState: sendObstacleImagesState},
    {capability: Capability.FloorMaterialDirectionAwareNavigationControl, name: translate("Floor direction aware navigation"), fetchState: fetchFloorMaterialDirectionAwareNavigationControlState, updateState: sendFloorMaterialDirectionAwareNavigationControlState},
    {capability: Capability.MopDockMopAutoDryingControl, name: translate("Automatic mop drying"), fetchState: fetchMopDockMopAutoDryingControlState, updateState: sendMopDockMopAutoDryingControlState}
]);
const visible = computed(() => settings.value.filter(setting => props.capabilities.includes(setting.capability)));
const selections = computed(() => [
    {capability: Capability.CarpetSensorModeControl, name: translate("Carpet sensor"), description: translate("Action when carpet is detected during mopping"), fetchValue: fetchCarpetSensorMode, fetchOptions: async () => (await fetchCarpetSensorModeProperties()).supportedModes, updateValue: (value: string) => sendCarpetSensorMode({mode: value as CarpetSensorMode})},
    {capability: Capability.CleanRouteControl, name: translate("Clean route"), description: translate("Route used for cleaning"), fetchValue: fetchCleanRoute, fetchOptions: async () => (await fetchCleanRouteControlProperties()).supportedRoutes, updateValue: (value: string) => sendCleanRoute({route: value as CleanRoute})},
    {capability: Capability.AutoEmptyDockAutoEmptyIntervalControl, name: translate("Dock auto-empty"), description: translate("How often the dock empties the robot"), fetchValue: fetchAutoEmptyDockAutoEmptyInterval, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyIntervalProperties()).supportedIntervals, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyInterval({interval: value as AutoEmptyDockAutoEmptyInterval})},
    {capability: Capability.AutoEmptyDockAutoEmptyDurationControl, name: translate("Auto-empty duration"), description: translate("Length of the emptying cycle"), fetchValue: fetchAutoEmptyDockAutoEmptyDuration, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyDurationControlProperties()).supportedDurations, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyDuration({duration: value as AutoEmptyDockAutoEmptyDuration})},
    {capability: Capability.MopDockMopWashTemperatureControl, name: translate("Mop wash temperature"), description: translate("Dock washing temperature"), fetchValue: fetchMopDockMopWashTemperature, fetchOptions: async () => (await fetchMopDockMopWashTemperatureProperties()).supportedTemperatures, updateValue: (value: string) => sendMopDockMopWashTemperature({temperature: value as MopDockMopWashTemperature})},
    {capability: Capability.MopDockMopDryingTimeControl, name: translate("Mop drying time"), description: translate("Dock drying duration"), fetchValue: fetchMopDockMopDryingTime, fetchOptions: async () => (await fetchMopDockMopDryingTimeControlProperties()).supportedDurations, updateValue: (value: string) => sendMopDockMopDryingTime({duration: value as MopDockMopDryingDuration})}
]);
const visibleSelections = computed(() => selections.value.filter(setting => props.capabilities.includes(setting.capability)));
const systemOptionsSupported = computed(() => props.capabilities.some(capability => [Capability.SpeakerVolumeControl, Capability.SpeakerTest, Capability.VoicePackManagement, Capability.DoNotDisturb].includes(capability)));
const locate = useMutation({mutationFn: sendLocateCommand});
</script>

<template>
    <section class="panel max-w-3xl">
        <h1 class="mb-1 text-2xl font-bold">{{ $t("Robot options") }}</h1>
        <p class="muted mb-5">{{ $t("Controls available on this robot") }}</p>
        <ToggleSetting v-for="setting in visible" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-state="setting.fetchState" :update-state="setting.updateState" />
        <SelectSetting v-for="setting in visibleSelections" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-value="setting.fetchValue" :fetch-options="setting.fetchOptions" :update-value="setting.updateValue" />
        <div v-if="capabilities.includes(Capability.Locate)" class="mt-5"><Button :label='$t("Locate robot")' outlined :loading="locate.isPending.value" @click="locate.mutate()" /></div>
        <div class="mt-5 flex gap-3"><RouterLink v-if="systemOptionsSupported" class="nav-card" to="/options/robot/system">{{ $t("System options") }}</RouterLink><RouterLink v-if="capabilities.includes(Capability.Quirks)" class="nav-card" to="/options/robot/quirks">{{ $t("Quirks") }}</RouterLink></div>
        <Message v-if="locate.isError.value" severity="error" class="mt-4">{{ $t("Unable to locate robot.") }}</Message>
    </section>
</template>
