<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability} from "../api/types";
import {fetchRobotInformation, fetchStateAttributes, sendBasicControlCommand, type BasicControlCommand} from "../api/client";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import {isBasicCommandEnabled} from "../basicControl";
import LiveMapPanel from "../components/LiveMapPanel.vue";
import HomeDetails from "../components/HomeDetails.vue";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const robot = useQuery({queryKey: ["robotInformation"], queryFn: fetchRobotInformation, retry: 1});
const {query: attributes, status, batteries, queryKey} = useRobotAttributes();
const queryClient = useQueryClient();
const basicControlSupported = computed(() => props.capabilities.includes(Capability.BasicControl));
const command = useMutation({
    mutationFn: async (action: BasicControlCommand) => {
        await sendBasicControlCommand(action);
        return fetchStateAttributes();
    },
    onSuccess: data => queryClient.setQueryData(queryKey, data)
});
const actions: BasicControlCommand[] = ["start", "pause", "stop", "home"];
const primaryAction = computed<BasicControlCommand | undefined>(() => actions.find(action => action !== "home" && isBasicCommandEnabled(action, status.value)));
const pendingMapAction = ref(false);
const confirmFullCleanup = ref(false);

function send(action: BasicControlCommand) {
    if (!basicControlSupported.value || !isBasicCommandEnabled(action, status.value) || command.isPending.value) return;
    if (action === "start" && pendingMapAction.value) {
        confirmFullCleanup.value = true;
        return;
    }
    command.mutate(action);
}

function startConfirmed() {
    confirmFullCleanup.value = false;
    if (isBasicCommandEnabled("start", status.value) && !command.isPending.value) command.mutate("start");
}
</script>

<template>
    <section class="grid gap-5 pb-20 md:grid-cols-2 md:pb-0">
        <div class="panel md:col-span-2">
            <p class="muted mb-2 text-sm uppercase tracking-wider">{{ $t("Robot") }}</p>
            <p v-if="robot.isPending.value" role="status">{{ $t("Loading robot information…") }}</p>
            <p v-else-if="robot.isError.value" role="alert">{{ $t("Robot information is unavailable.") }}</p>
            <template v-else>
                <h1 class="text-3xl font-bold">{{ robot.data.value?.modelName }}</h1>
                <p class="muted mt-2">{{ robot.data.value?.manufacturer }}</p>
            </template>
        </div>
        <LiveMapPanel class="md:col-span-2" :capabilities="capabilities" :palette-mode="paletteMode"
            :status="status" @pending-change="value => pendingMapAction = value" />
        <HomeDetails :capabilities="capabilities" :attributes="attributes.data.value ?? []" />
        <div class="panel md:col-span-2">
            <h2 class="mb-4 text-xl font-semibold">{{ $t("Current state") }}</h2>
            <p v-if="attributes.isPending.value" role="status">{{ $t("Loading robot state…") }}</p>
            <Message v-else-if="attributes.isError.value" severity="error">{{ $t("Unable to load robot state.") }}</Message>
            <template v-else>
                <p v-if="status">{{ valueLabel(status.value) }}<span v-if="status.flag !== 'none'"> · {{ valueLabel(status.flag) }}</span></p>
                <p v-else class="muted">{{ $t("No status reported.") }}</p>
                <div v-if="batteries.length" class="mt-3 flex flex-wrap gap-4">
                    <p v-for="(battery, index) in batteries" :key="index">
                        {{ $t("Battery") }}{{ batteries.length > 1 ? ` ${index + 1}` : "" }}: {{ Math.round(battery.level) }}%
                    </p>
                </div>
            </template>
            <template v-if="basicControlSupported">
                <div class="mt-5 hidden flex-wrap gap-2 md:flex">
                    <Button v-for="action in actions" :key="action"
                        :label="action === 'start' && status?.flag === 'resumable' ? $t('Resume') : action === 'home' ? $t('Dock') : action === 'start' ? $t('Start full cleanup') : $t(action === 'pause' ? 'Pause' : 'Stop')"
                        :disabled="!isBasicCommandEnabled(action, status) || attributes.isError.value || command.isPending.value"
                        :loading="command.isPending.value && command.variables.value === action"
                        outlined @click="send(action)" />
                </div>
                <Message v-if="command.isError.value" severity="error" class="mt-4">{{ $t("Command failed. Check the robot state and try again.") }}</Message>
            </template>
        </div>
        <div v-if="basicControlSupported" class="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-lg md:hidden" style="background: var(--app-surface); border-color: var(--app-border)">
            <Button v-if="primaryAction" class="flex-1" :label="primaryAction === 'start' && status?.flag === 'resumable' ? $t('Resume') : primaryAction === 'start' ? $t('Start full cleanup') : primaryAction === 'pause' ? $t('Pause') : $t('Stop')" :disabled="attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === primaryAction" @click="send(primaryAction)" />
            <Button v-if="primaryAction !== 'stop' && isBasicCommandEnabled('stop', status)" :label='$t("Stop")' severity="danger" outlined :disabled="attributes.isError.value || command.isPending.value" :loading="command.isPending.value && command.variables.value === 'stop'" @click="send('stop')" />
            <Button :label='$t("Dock")' outlined :disabled="!isBasicCommandEnabled('home', status) || attributes.isError.value || command.isPending.value" @click="send('home')" />
        </div>
        <Dialog v-model:visible="confirmFullCleanup" modal :header='$t("Start full cleanup?")' class="max-w-md">
            <p>{{ $t("You have a selected action on the map. Starting a full cleanup will ignore that selection.") }}</p>
            <div class="mt-5 flex justify-end gap-2">
                <Button :label='$t("Cancel")' text @click="confirmFullCleanup = false" />
                <Button :label='$t("Start full cleanup")' @click="startConfirmed" />
            </div>
        </Dialog>
    </section>
</template>
