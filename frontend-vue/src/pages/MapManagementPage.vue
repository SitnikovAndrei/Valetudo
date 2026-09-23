<script setup lang="ts">
import {ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability, type ValetudoInformation} from "../../../frontend/src/api/types";
import {fetchDuststreamingConfiguration, fetchMap, fetchPersistentMapState, sendMapReset, sendPersistentMapEnabled, sendStartMappingPass} from "../../../frontend/src/api/client";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const queryClient = useQueryClient();
const persistent = useQuery({queryKey: ["persistentMap"], queryFn: fetchPersistentMapState, enabled: props.capabilities.includes(Capability.PersistentMapControl)});
const map = useQuery({queryKey: ["robotMap"], queryFn: fetchMap});
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: props.capabilities.includes(Capability.Duststreaming)});
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
    <section class="panel">
        <h1 class="mb-1 text-2xl font-bold">Map options</h1>
        <p class="muted mb-5">Robot managed map features and utilities</p>
        <div class="grid gap-3 sm:grid-cols-2">
            <label v-if="capabilities.includes(Capability.PersistentMapControl)" class="nav-card flex items-center gap-2"><Checkbox :model-value="persistent.data.value?.enabled ?? false" binary :disabled="persistent.isPending.value || mutation.isPending.value" @update:model-value="togglePersistent(Boolean($event))" /> Persistent maps</label>
            <Button v-if="capabilities.includes(Capability.MappingPass)" label="Start mapping pass" outlined :disabled="mutation.isPending.value" @click="confirmation = 'mapping'" />
            <Button v-if="capabilities.includes(Capability.MapReset)" label="Reset map" severity="danger" outlined :disabled="mutation.isPending.value" @click="confirmation = 'reset'" />
            <Button label="Export ValetudoMap" outlined :disabled="!map.data.value" @click="exportMap" />
            <RouterLink v-if="capabilities.includes(Capability.CombinedVirtualRestrictions)" class="nav-card" to="/options/map_management/virtual_restrictions">Virtual restrictions</RouterLink>
            <RouterLink v-if="capabilities.includes(Capability.MapAnnotations)" class="nav-card" to="/options/map_management/annotations">Map annotations</RouterLink>
            <RouterLink v-if="capabilities.includes(Capability.MapSegmentEdit) || capabilities.includes(Capability.MapSegmentRename) || capabilities.includes(Capability.MapSegmentMaterialControl)" class="nav-card" to="/options/map_management/segments">Segment management</RouterLink>
            <RouterLink class="nav-card" to="/options/map_management/robot_coverage">Robot coverage map</RouterLink>
            <RouterLink v-if="capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled" class="nav-card" to="/options/map_management/spectator">Spectator map</RouterLink>
        </div>
        <Message v-if="persistent.isError.value || map.isError.value || mutation.isError.value" severity="error" class="mt-4">A map request failed.</Message>
        <Dialog :visible="confirmation !== null" modal :header="confirmation === 'reset' ? 'Reset map?' : confirmation === 'mapping' ? 'Start mapping pass?' : 'Disable persistent maps?'" class="max-w-md" @update:visible="confirmation = null">
            <p v-if="confirmation === 'disable'">This will delete the currently stored map.</p>
            <p v-else-if="confirmation === 'reset'">Do you really want to reset the map?</p>
            <p v-else>Do you really want to start a mapping pass?</p>
            <div class="mt-5 flex justify-end gap-2"><Button label="Cancel" text @click="confirmation = null" /><Button label="Confirm" :loading="mutation.isPending.value" @click="confirmation && mutation.mutate(confirmation)" /></div>
        </Dialog>
    </section>
</template>
