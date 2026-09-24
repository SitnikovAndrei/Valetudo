<script setup lang="ts">
import {ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import {Capability} from "../api/types";
import {aprilFools} from "../aprilFools";
import ValetudoActivation from "../components/ValetudoActivation.vue";
import {fetchDuststreamingConfiguration, fetchUpdaterConfiguration, fetchValetudoCustomizations, sendDuststreamingConfiguration, sendRestoreDefaultConfigurationAction, sendUpdaterConfiguration, sendValetudoCustomizations} from "../api/client";

const props = defineProps<{capabilities: Capability[]}>();
const queryClient = useQueryClient();
const customizations = useQuery({queryKey: ["valetudoCustomizations"], queryFn: fetchValetudoCustomizations});
const updater = useQuery({queryKey: ["updaterConfiguration"], queryFn: fetchUpdaterConfiguration});
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: props.capabilities.includes(Capability.Duststreaming)});
const friendlyName = ref("");
const editing = ref(false);
const confirmRestore = ref(false);
watch(customizations.data, value => {if (value) friendlyName.value = value.friendlyName;}, {immediate: true});
const saveName = useMutation({mutationFn: sendValetudoCustomizations, onSuccess: async () => {editing.value = false; await queryClient.invalidateQueries({queryKey: ["valetudoCustomizations"]});}});
const saveUpdater = useMutation({mutationFn: sendUpdaterConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["updaterConfiguration"]})});
const saveDuststream = useMutation({mutationFn: sendDuststreamingConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["duststreamConfiguration"]})});
const restore = useMutation({mutationFn: sendRestoreDefaultConfigurationAction, onSuccess: () => {confirmRestore.value = false; void queryClient.invalidateQueries();}});

function normalizeName() {
    friendlyName.value = friendlyName.value.replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 24);
}
</script>

<template>
    <section class="panel max-w-3xl">
        <h1 class="mb-1 text-2xl font-bold">{{ $t("Valetudo options") }}</h1>
        <p class="muted mb-5">{{ $t("Tunables and actions provided by Valetudo") }}</p>
        <div class="space-y-5">
            <ValetudoActivation v-if="aprilFools" />
            <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style="border-color: var(--app-border)"><div><h2 class="font-semibold">{{ $t("Custom friendly name") }}</h2><p class="muted text-sm">{{ customizations.data.value?.friendlyName || $t("Set a name for network advertisement and MQTT") }}</p></div><Button :label='$t("Edit")' outlined :disabled="customizations.isPending.value" @click="editing = true" /></div>
            <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style="border-color: var(--app-border)"><div><h2 class="font-semibold">{{ $t("Update channel") }}</h2><p class="muted text-sm">{{ $t("Select the channel used by the updater") }}</p></div><Select :model-value="updater.data.value?.updateProvider" :options="[{label: $t('Release'), value: 'github'}, {label: $t('Nightly'), value: 'github_nightly'}]" option-label="label" option-value="value" :disabled="updater.isPending.value || saveUpdater.isPending.value" @update:model-value="value => saveUpdater.mutate({updateProvider: value})" /></div>
            <label v-if="capabilities.includes(Capability.Duststreaming)" class="flex items-center gap-3 border-b pb-4" style="border-color: var(--app-border)"><Checkbox :model-value="duststream.data.value?.enabled ?? false" binary :disabled="duststream.isPending.value || saveDuststream.isPending.value" @update:model-value="value => saveDuststream.mutate({enabled: Boolean(value)})" /> {{ $t("Enable camera stream") }}</label>
            <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold">{{ $t("Restore default configuration") }}</h2><p class="muted text-sm">{{ $t("Only Valetudo settings are affected") }}</p></div><Button :label='$t("Restore")' severity="danger" outlined @click="confirmRestore = true" /></div>
        </div>
        <Message v-if="customizations.isError.value || updater.isError.value || duststream.isError.value || saveName.isError.value || saveUpdater.isError.value || saveDuststream.isError.value || restore.isError.value" severity="error" class="mt-4">{{ $t("A settings request failed.") }}</Message>
        <Dialog v-model:visible="editing" modal :header='$t("Custom friendly name")' class="max-w-md"><p class="mb-3">{{ $t("Up to 24 letters, digits, spaces or hyphens.") }}</p><InputText v-model="friendlyName" maxlength="24" class="w-full" @input="normalizeName" /><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="editing = false" /><Button :label='$t("Save")' :loading="saveName.isPending.value" @click="normalizeName(); saveName.mutate({friendlyName})" /></div></Dialog>
        <Dialog v-model:visible="confirmRestore" modal :header='$t("Restore default Valetudo configuration?")' class="max-w-md"><p>{{ $t("This will not affect Wi-Fi settings or map data.") }}</p><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="confirmRestore = false" /><Button :label='$t("Restore")' severity="danger" :loading="restore.isPending.value" @click="restore.mutate()" /></div></Dialog>
    </section>
</template>
