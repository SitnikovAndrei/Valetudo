<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import {fetchUpdaterState, sendUpdaterCommand} from "../api/client";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";

type Command = "check" | "download" | "apply";
const queryClient = useQueryClient();
const state = useQuery({queryKey: ["updaterState"], queryFn: fetchUpdaterState, refetchInterval: 5000});
const confirmation = ref<"download" | "apply" | null>(null);
const command = useMutation({mutationFn: sendUpdaterCommand, onSuccess: async () => {
    confirmation.value = null;
    await queryClient.invalidateQueries({queryKey: ["updaterState"]});
}});
const available = computed<Command | undefined>(() => {
    if (!state.data.value || state.data.value.busy) return undefined;
    if (["ValetudoUpdaterIdleState", "ValetudoUpdaterErrorState", "ValetudoUpdaterNoUpdateRequiredState"].includes(state.data.value.__class)) return "check";
    if (state.data.value.__class === "ValetudoUpdaterApprovalPendingState") return "download";
    if (state.data.value.__class === "ValetudoUpdaterApplyPendingState") return "apply";
    return undefined;
});

function start(action: Command) {
    if (action === "check") command.mutate(action);
    else confirmation.value = action;
}
</script>

<template>
    <div class="page max-w-3xl">
        <PageHeader :title="$t('Updater')">
            <template #actions><Button :label='$t("Refresh")' text :loading="state.isFetching.value" @click="state.refetch()" /></template>
        </PageHeader>
        <section class="panel">
            <p v-if="state.isPending.value" role="status">{{ $t("Loading updater state…") }}</p>
            <Message v-else-if="state.isError.value || command.isError.value" severity="error">{{ $t("Updater request failed.") }}</Message>
            <template v-else-if="state.data.value">
                <p class="mb-4">{{ valueLabel(state.data.value.__class) }}</p>
                <p v-if="state.data.value.message" class="mb-3">{{ state.data.value.message }}</p>
                <p v-if="state.data.value.currentVersion">{{ $t("Current version:") }} {{ state.data.value.currentVersion }}</p>
                <p v-if="state.data.value.version">{{ $t("Available version:") }} {{ state.data.value.version }}</p>
                <ProgressBar v-if="state.data.value.__class === 'ValetudoUpdaterDownloadingState'" class="mt-4" :value="state.data.value.metaData?.progress" :mode="state.data.value.metaData?.progress === undefined ? 'indeterminate' : 'determinate'" />
                <details v-if="state.data.value.changelog" class="mt-4"><summary>{{ $t("Changelog") }}</summary><pre class="mt-2 max-h-96 overflow-auto whitespace-pre-wrap">{{ state.data.value.changelog }}</pre></details>
                <Message v-if="available === 'apply'" severity="warn" class="mt-4">{{ $t("Updates may need troubleshooting afterward. Read the changelog before applying.") }}</Message>
                <Button v-if="available" :label="available === 'check' ? $t('Check for updates') : available === 'download' ? $t('Download update') : $t('Apply update')" class="mt-5" :loading="command.isPending.value" @click="start(available)" />
            </template>
            <Dialog :visible="confirmation !== null" modal :header="confirmation === 'download' ? $t('Download update?') : $t('Apply update?')" class="max-w-md" @update:visible="confirmation = null">
                <p v-if="confirmation === 'apply'">{{ $t("The robot may restart during this update. Read the changelog before continuing.") }}</p>
                <p v-else>{{ $t("Download the available update?") }}</p>
                <div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="confirmation = null" /><Button :label='$t("Confirm")' :loading="command.isPending.value" @click="confirmation && command.mutate(confirmation)" /></div>
            </Dialog>
        </section>
    </div>
</template>
