<script setup lang="ts">
import {ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability, type ValetudoInformation} from "../api/types";
import {useRobotMap} from "../composables/useRobotMap";
import {fetchPersistentMapState, sendMapReset, sendPersistentMapEnabled, sendStartMappingPass} from "../api/client";
import PageHeader from "../components/PageHeader.vue";
import {duststreamConfigurationQuery} from "../api/queries";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const queryClient = useQueryClient();
const persistent = useQuery({queryKey: ["persistentMap"], queryFn: fetchPersistentMapState, enabled: props.capabilities.includes(Capability.PersistentMapControl)});
const map = useRobotMap({live: false});
const duststream = useQuery({...duststreamConfigurationQuery, enabled: props.capabilities.includes(Capability.Duststreaming)});
const confirmation = ref<"reset" | "mapping" | "disable" | null>(null);
const mutation = useMutation({
    mutationFn: async (action: "reset" | "mapping" | "disable" | "enable") => {
        if (action === "reset") return sendMapReset();
        if (action === "mapping") return sendStartMappingPass();
        return sendPersistentMapEnabled(action === "enable");
    },
    onSuccess: async () => {
        confirmation.value = null;
        await Promise.all([
            queryClient.invalidateQueries({queryKey: ["persistentMap"]}),
            queryClient.invalidateQueries({queryKey: ["robotMap"]})
        ]);
    }
});

function exportMap() {
    if (!map.data.value) return;
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const url = URL.createObjectURL(new Blob([JSON.stringify(map.data.value, null, 2)], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ValetudoMapExport-${props.information.systemId}-${timestamp}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function togglePersistent(value: boolean) {
    if (value) mutation.mutate("enable");
    else confirmation.value = "disable";
}
</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Map options')" :subtitle="$t('Robot managed map features and utilities')" />
        <section class="panel">
            <div class="grid gap-3 sm:grid-cols-2">
                <label v-if="capabilities.includes(Capability.PersistentMapControl)" class="nav-card flex items-center gap-2"><Checkbox :model-value="persistent.data.value?.enabled ?? false" binary :disabled="persistent.isPending.value || mutation.isPending.value" @update:model-value="togglePersistent(Boolean($event))" /><span><span class="block">{{ $t("Persistent maps") }}</span><span class="muted block text-sm">{{ $t("Store a persistent map") }}</span></span></label>
                <div v-if="capabilities.includes(Capability.MappingPass)" class="nav-card"><Button :label='$t("Start mapping pass")' outlined :disabled="mutation.isPending.value" @click="confirmation = 'mapping'" /><p class="muted mt-2 text-sm">{{ $t("Create a new map") }}</p></div>
                <div v-if="capabilities.includes(Capability.MapReset)" class="nav-card"><Button :label='$t("Reset map")' severity="danger" outlined :disabled="mutation.isPending.value" @click="confirmation = 'reset'" /><p class="muted mt-2 text-sm">{{ $t("Delete the current map") }}</p></div>
                <div class="nav-card"><Button :label='$t("Export ValetudoMap")' outlined :disabled="!map.data.value" @click="exportMap" /><p class="muted mt-2 text-sm">{{ $t("Download a ValetudoMap data export to use with other tools") }}</p></div>
                <RouterLink v-if="capabilities.includes(Capability.CombinedVirtualRestrictions)" class="nav-card" to="/options/map_management/virtual_restrictions"><span class="block">{{ $t("Virtual restrictions") }}</span><span class="muted block text-sm">{{ $t("Create, modify and delete various virtual restrictions") }}</span></RouterLink>
                <RouterLink v-if="capabilities.includes(Capability.MapAnnotations)" class="nav-card" to="/options/map_management/annotations"><span class="block">{{ $t("Map annotations") }}</span><span class="muted block text-sm">{{ $t("Create, modify and delete various other map stuff") }}</span></RouterLink>
                <RouterLink v-if="capabilities.includes(Capability.MapSegmentEdit) || capabilities.includes(Capability.MapSegmentRename) || capabilities.includes(Capability.MapSegmentMaterialControl)" class="nav-card" to="/options/map_management/segments"><span class="block">{{ $t("Segment management") }}</span><span class="muted block text-sm">{{ $t("Modify the maps segments") }}</span></RouterLink>
                <RouterLink class="nav-card" to="/options/map_management/robot_coverage"><span class="block">{{ $t("Robot coverage map") }}</span><span class="muted block text-sm">{{ $t("Check the robots coverage") }}</span></RouterLink>
                <RouterLink v-if="capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled" class="nav-card" to="/options/map_management/spectator"><span class="block">{{ $t("Spectator map") }}</span><span class="muted block text-sm">{{ $t("Watch it clean") }}</span></RouterLink>
            </div>
            <Message v-if="persistent.isError.value || map.isError.value || mutation.isError.value" severity="error" class="mt-4">{{ $t("A map request failed.") }}</Message>
            <Dialog :visible="confirmation !== null" modal :header="confirmation === 'reset' ? 'Reset map?' : confirmation === 'mapping' ? $t('Start mapping pass?') : $t('Disable persistent maps?')" class="max-w-md" @update:visible="confirmation = null">
                <p v-if="confirmation === 'disable'">{{ $t("This will delete the currently stored map.") }}</p>
                <p v-else-if="confirmation === 'reset'">{{ $t("Do you really want to reset the map?") }}</p>
                <p v-else>{{ $t("Do you really want to start a mapping pass?") }}</p>
                <div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="confirmation = null" /><Button :label='$t("Confirm")' :loading="mutation.isPending.value" @click="confirmation && mutation.mutate(confirmation)" /></div>
            </Dialog>
        </section>
    </div>
</template>
