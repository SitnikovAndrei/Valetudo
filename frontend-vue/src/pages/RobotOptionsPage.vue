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

const props = defineProps<{capabilities: Capability[]}>();
const settings = [
    {capability: Capability.KeyLock, name: "Lock keys", description: "Prevents operation using the robot's physical buttons", fetchState: fetchKeyLockState, updateState: sendKeyLockEnable},
    {capability: Capability.CarpetModeControl, name: "Carpet mode", description: "Increase suction on carpet", fetchState: fetchCarpetModeState, updateState: sendCarpetModeEnable},
    {capability: Capability.ObstacleAvoidanceControl, name: "Obstacle avoidance", fetchState: fetchObstacleAvoidanceControlState, updateState: sendObstacleAvoidanceControlState},
    {capability: Capability.PetObstacleAvoidanceControl, name: "Pet obstacle avoidance", fetchState: fetchPetObstacleAvoidanceControlState, updateState: sendPetObstacleAvoidanceControlState},
    {capability: Capability.CollisionAvoidantNavigation, name: "Collision avoidant navigation", fetchState: fetchCollisionAvoidantNavigationControlState, updateState: sendCollisionAvoidantNavigationControlState},
    {capability: Capability.MopExtensionControl, name: "Mop extension", fetchState: fetchMopExtensionControlState, updateState: sendMopExtensionControlState},
    {capability: Capability.MopTwistControl, name: "Mop twist", fetchState: fetchMopTwistControlState, updateState: sendMopTwistControlState},
    {capability: Capability.MopExtensionFurnitureLegHandlingControl, name: "Furniture leg handling", fetchState: fetchMopExtensionFurnitureLegHandlingControlState, updateState: sendMopExtensionFurnitureLegHandlingControlState},
    {capability: Capability.CameraLightControl, name: "Camera light", fetchState: fetchCameraLightControlState, updateState: sendCameraLightControlState},
    {capability: Capability.ObstacleImages, name: "Obstacle images", fetchState: fetchObstacleImagesState, updateState: sendObstacleImagesState},
    {capability: Capability.FloorMaterialDirectionAwareNavigationControl, name: "Floor direction aware navigation", fetchState: fetchFloorMaterialDirectionAwareNavigationControlState, updateState: sendFloorMaterialDirectionAwareNavigationControlState},
    {capability: Capability.MopDockMopAutoDryingControl, name: "Automatic mop drying", fetchState: fetchMopDockMopAutoDryingControlState, updateState: sendMopDockMopAutoDryingControlState}
];
const visible = computed(() => settings.filter(setting => props.capabilities.includes(setting.capability)));
const selections = [
    {capability: Capability.CarpetSensorModeControl, name: "Carpet sensor", description: "Action when carpet is detected during mopping", fetchValue: fetchCarpetSensorMode, fetchOptions: async () => (await fetchCarpetSensorModeProperties()).supportedModes, updateValue: (value: string) => sendCarpetSensorMode({mode: value as CarpetSensorMode})},
    {capability: Capability.CleanRouteControl, name: "Clean route", description: "Route used for cleaning", fetchValue: fetchCleanRoute, fetchOptions: async () => (await fetchCleanRouteControlProperties()).supportedRoutes, updateValue: (value: string) => sendCleanRoute({route: value as CleanRoute})},
    {capability: Capability.AutoEmptyDockAutoEmptyIntervalControl, name: "Dock auto-empty", description: "How often the dock empties the robot", fetchValue: fetchAutoEmptyDockAutoEmptyInterval, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyIntervalProperties()).supportedIntervals, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyInterval({interval: value as AutoEmptyDockAutoEmptyInterval})},
    {capability: Capability.AutoEmptyDockAutoEmptyDurationControl, name: "Auto-empty duration", description: "Length of the emptying cycle", fetchValue: fetchAutoEmptyDockAutoEmptyDuration, fetchOptions: async () => (await fetchAutoEmptyDockAutoEmptyDurationControlProperties()).supportedDurations, updateValue: (value: string) => sendAutoEmptyDockAutoEmptyDuration({duration: value as AutoEmptyDockAutoEmptyDuration})},
    {capability: Capability.MopDockMopWashTemperatureControl, name: "Mop wash temperature", description: "Dock washing temperature", fetchValue: fetchMopDockMopWashTemperature, fetchOptions: async () => (await fetchMopDockMopWashTemperatureProperties()).supportedTemperatures, updateValue: (value: string) => sendMopDockMopWashTemperature({temperature: value as MopDockMopWashTemperature})},
    {capability: Capability.MopDockMopDryingTimeControl, name: "Mop drying time", description: "Dock drying duration", fetchValue: fetchMopDockMopDryingTime, fetchOptions: async () => (await fetchMopDockMopDryingTimeControlProperties()).supportedDurations, updateValue: (value: string) => sendMopDockMopDryingTime({duration: value as MopDockMopDryingDuration})}
];
const visibleSelections = computed(() => selections.filter(setting => props.capabilities.includes(setting.capability)));
const systemOptionsSupported = computed(() => props.capabilities.some(capability => [Capability.SpeakerVolumeControl, Capability.SpeakerTest, Capability.VoicePackManagement, Capability.DoNotDisturb].includes(capability)));
const locate = useMutation({mutationFn: sendLocateCommand});
</script>

<template>
    <section class="panel max-w-3xl">
        <h1 class="mb-1 text-2xl font-bold">Robot options</h1>
        <p class="muted mb-5">Controls available on this robot</p>
        <ToggleSetting v-for="setting in visible" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-state="setting.fetchState" :update-state="setting.updateState" />
        <SelectSetting v-for="setting in visibleSelections" :key="setting.capability" :name="setting.name" :description="setting.description" :query-key="setting.capability" :fetch-value="setting.fetchValue" :fetch-options="setting.fetchOptions" :update-value="setting.updateValue" />
        <div v-if="capabilities.includes(Capability.Locate)" class="mt-5"><Button label="Locate robot" outlined :loading="locate.isPending.value" @click="locate.mutate()" /></div>
        <div class="mt-5 flex gap-3"><RouterLink v-if="systemOptionsSupported" class="nav-card" to="/options/robot/system">System options</RouterLink><RouterLink v-if="capabilities.includes(Capability.Quirks)" class="nav-card" to="/options/robot/quirks">Quirks</RouterLink></div>
        <Message v-if="locate.isError.value" severity="error" class="mt-4">Unable to locate robot.</Message>
    </section>
</template>
