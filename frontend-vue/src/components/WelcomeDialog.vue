<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability, type ValetudoInformation} from "../../../frontend/src/api/types";
import {fetchPersistentMapState, sendBasicControlCommand, sendDismissWelcomeDialogAction, sendPersistentMapEnabled, sendStartMappingPass} from "../../../frontend/src/api/client";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const queryClient = useQueryClient();
const hidden = ref(false);
const confirmAction = ref<"mapping" | "cleanup" | "disable" | null>(null);
const open = computed(() => !props.information.welcomeDialogDismissed && !hidden.value);
const persistent = useQuery({queryKey: ["persistentMap"], queryFn: fetchPersistentMapState, enabled: computed(() => open.value && props.capabilities.includes(Capability.PersistentMapControl))});
const action = useMutation({mutationFn: async (kind: "mapping" | "cleanup" | "disable" | "enable") => {
    if (kind === "mapping") return sendStartMappingPass();
    if (kind === "cleanup") return sendBasicControlCommand("start");
    return sendPersistentMapEnabled(kind === "enable");
}, onSuccess: async () => {confirmAction.value = null; await queryClient.invalidateQueries({queryKey: ["persistentMap"]});}});
const dismiss = useMutation({mutationFn: sendDismissWelcomeDialogAction, onSuccess: async () => {hidden.value = true; await queryClient.invalidateQueries({queryKey: ["valetudoInformation"]});}});
function togglePersistent(enabled: boolean) {if (enabled) action.mutate("enable"); else confirmAction.value = "disable";}
</script>

<template>
    <Dialog :visible="open" modal :header='$t("Welcome to Valetudo")' class="w-[min(95vw,42rem)]" :closable="false">
        <p>{{ $t("It looks like this may be your first time using Valetudo on this robot. The first step is usually to create a map of your home.") }}</p>
        <p class="mt-3">{{ $t("For initial mapping, dock the robot, open relevant doors, remove loose cables and block off areas it should avoid.") }}</p>
        <label v-if="capabilities.includes(Capability.PersistentMapControl)" class="mt-5 flex items-center gap-2"><Checkbox :model-value="persistent.data.value?.enabled ?? false" binary :disabled="persistent.isPending.value || action.isPending.value" @update:model-value="togglePersistent(Boolean($event))" /> {{ $t("Persistent maps") }}</label>
        <div class="mt-5"><Button v-if="capabilities.includes(Capability.MappingPass)" :label='$t("Start mapping pass")' outlined @click="confirmAction = 'mapping'" /><Button v-else-if="capabilities.includes(Capability.BasicControl)" :label='$t("Start full cleanup to map")' outlined @click="confirmAction = 'cleanup'" /></div>
        <p class="mt-5">{{ $t("You can also") }} <a href="https://github.com/sponsors/Hypfer" target="_blank" rel="noopener noreferrer">{{ $t("support Valetudo") }}</a>.</p>
        <Message v-if="action.isError.value || dismiss.isError.value" severity="error" class="mt-4">{{ $t("Action failed.") }}</Message>
        <div class="mt-6 flex justify-end gap-2"><Button :label='$t("Hide")' text @click="hidden = true" /><Button :label='$t("Do not show again")' :loading="dismiss.isPending.value" @click="dismiss.mutate()" /></div>
    </Dialog>
    <Dialog :visible="confirmAction !== null" modal :header="confirmAction === 'disable' ? $t('Disable persistent maps?') : confirmAction === 'mapping' ? $t('Start mapping pass?') : $t('Start full cleanup?')" class="max-w-md" @update:visible="confirmAction = null"><p v-if="confirmAction === 'disable'">{{ $t("The stored map will be deleted.") }}</p><p v-else-if="confirmAction === 'cleanup'">{{ $t("The robot must return to the dock on its own to save the new map.") }}</p><p v-else>{{ $t("Start a mapping pass now?") }}</p><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="confirmAction = null" /><Button :label='$t("Confirm")' :loading="action.isPending.value" @click="confirmAction && action.mutate(confirmAction)" /></div></Dialog>
</template>
