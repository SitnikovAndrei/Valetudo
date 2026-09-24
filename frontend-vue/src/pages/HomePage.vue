<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability} from "../api/types";
import {fetchRobotInformation, fetchStateAttributes, sendBasicControlCommand, type BasicControlCommand} from "../api/client";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import {isBasicCommandEnabled} from "../basicControl";
import LiveMapPanel from "../components/LiveMapPanel.vue";
import HomeDetails from "../components/HomeDetails.vue";
import HomeCommandIcon from "../components/HomeCommandIcon.vue";
import PresetSettings from "../components/PresetSettings.vue";
import PageHeader from "../components/PageHeader.vue";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const robot = useQuery({queryKey: ["robotInformation"], queryFn: fetchRobotInformation, retry: 1});
const {query: attributes, status, batteries, queryKey} = useRobotAttributes();
const queryClient = useQueryClient();
const command = useMutation({
    mutationFn: async (action: BasicControlCommand) => {
        await sendBasicControlCommand(action);
        return fetchStateAttributes();
    },
    onSuccess: data => queryClient.setQueryData(queryKey, data)
});
const actions: BasicControlCommand[] = ["start", "pause", "stop", "home"];
const hasPresets = computed(() => props.capabilities.some(capability => [Capability.FanSpeedControl, Capability.WaterUsageControl, Capability.OperationModeControl].includes(capability)));

function send(action: BasicControlCommand) {
    if (!isBasicCommandEnabled(action, status.value) || command.isPending.value || attributes.isError.value) return;
    command.mutate(action);
}
function label(action: BasicControlCommand) {
    if (action === "start") return status.value?.flag === "resumable" ? "Resume" : "Start cleaning";
    if (action === "home") return "Dock";
    return action === "pause" ? "Pause" : "Stop action";
}
</script>

<template>
    <div class="home-page">
        <PageHeader :title='$t("Map and controls")' :subtitle='$t("Choose an area and an action for the current state.")' :kicker='$t("Robot vacuum")' />
        <LiveMapPanel :capabilities="capabilities" :palette-mode="paletteMode" :status="status">
            <template #action-status>
                <span class="home-status-dot" :class="status?.value" aria-hidden="true" /><strong>{{ status ? valueLabel(status.value) : $t('Loading…') }}</strong><span>{{ robot.data.value?.modelName }}<template v-if="batteries.length"> · {{ Math.round(batteries[0].level) }}%</template></span>
            </template>
            <template #status>
                <div class="home-status-heading"><span class="page-header-kicker">{{ $t("Device") }}</span><span v-if="status" class="home-status-pill" :class="status.value">{{ valueLabel(status.value) }}</span></div>
                <div class="home-robot-hero"><span class="home-robot-avatar" aria-hidden="true" /><div><p v-if="robot.isPending.value" role="status" class="muted text-sm">{{ $t("Loading robot information…") }}</p><p v-else-if="robot.isError.value" role="alert" class="muted text-sm">{{ $t("Robot information is unavailable.") }}</p><h2 v-else>{{ robot.data.value?.modelName }}</h2><p class="muted home-robot-manufacturer">{{ robot.data.value?.manufacturer }}</p><p v-if="status" class="muted home-robot-state">{{ valueLabel(status.value) }}</p></div></div>
                <div v-if="attributes.isPending.value" class="muted mt-3 text-sm" role="status">{{ $t("Loading robot state…") }}</div>
                <Message v-else-if="attributes.isError.value" severity="error" class="mt-3">{{ $t("Unable to load robot state.") }}</Message>
                <div v-else class="home-robot-stats">
                    <div v-for="(battery, index) in batteries" :key="index"><strong>{{ Math.round(battery.level) }}%</strong><small>{{ $t("Battery") }}{{ batteries.length > 1 ? ` ${index + 1}` : "" }}</small></div>
                    <div v-if="status?.flag && status.flag !== 'none'"><strong>{{ valueLabel(status.flag) }}</strong><small>{{ $t("Status") }}</small></div>
                </div>
                <HomeDetails :capabilities="capabilities" :attributes="attributes.data.value ?? []" />
            </template>
            <template #actions="{mode}">
                <template v-if="capabilities.includes(Capability.BasicControl)">
                    <Button v-if="mode === 'all'" :label="$t(label('start'))" :disabled="!isBasicCommandEnabled('start', status) || attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === 'start'" @click="send('start')"><template #icon><HomeCommandIcon action="start" /></template></Button>
                    <div class="home-command-secondary">
                        <Button v-for="action in actions.filter(item => item !== 'start')" :key="action" :label="$t(label(action))" outlined :severity="action === 'stop' ? 'danger' : undefined" :disabled="!isBasicCommandEnabled(action, status) || attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === action" @click="send(action)"><template #icon><HomeCommandIcon :action="action" /></template></Button>
                    </div>
                    <Message v-if="command.isError.value" severity="error">{{ $t("Command failed. Check the robot state and try again.") }}</Message>
                </template>
            </template>
            <template #mobile-actions="{mode}">
                <template v-if="capabilities.includes(Capability.BasicControl)">
                    <Button v-if="mode === 'all'" :label="$t(label('start'))" :disabled="!isBasicCommandEnabled('start', status) || attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === 'start'" @click="send('start')"><template #icon><HomeCommandIcon action="start" /></template></Button>
                    <div class="home-mobile-secondary">
                        <Button v-for="action in actions.filter(item => item !== 'start')" :key="action" :label="$t(label(action))" outlined :severity="action === 'stop' ? 'danger' : undefined" :disabled="!isBasicCommandEnabled(action, status) || attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === action" @click="send(action)"><template #icon><HomeCommandIcon :action="action" /></template></Button>
                    </div>
                </template>
            </template>
            <template #presets><PresetSettings v-if="hasPresets" :capabilities="capabilities" :attributes="attributes.data.value ?? []" compact /></template>
        </LiveMapPanel>
    </div>
</template>
