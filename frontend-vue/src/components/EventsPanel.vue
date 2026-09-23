<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import Message from "primevue/message";
import {fetchValetudoEvents, sendValetudoEventInteraction} from "../../../frontend/src/api/client";
import type {ValetudoEvent, ValetudoEventInteraction} from "../../../frontend/src/api/types";

const queryClient = useQueryClient();
const events = useQuery({queryKey: ["valetudoEvents"], queryFn: fetchValetudoEvents, staleTime: 30000, refetchInterval: 30000});
const count = computed(() => events.data.value?.filter(event => !event.processed).length ?? 0);
const open = ref(false);
const interaction = useMutation({mutationFn: sendValetudoEventInteraction, onSuccess: () => queryClient.invalidateQueries({queryKey: ["valetudoEvents"]})});

function content(event: ValetudoEvent) {
    switch (event.__class) {
        case "ConsumableDepletedValetudoEvent": return `The ${event.subType ?? ""} ${event.type ?? ""} consumable is depleted.`;
        case "ErrorStateValetudoEvent": return `An error occurred: ${event.message || "Unknown error"}`;
        case "PendingMapChangeValetudoEvent": return "A map change is pending. Do you want to accept the new map?";
        case "DustBinFullValetudoEvent": return "The dust bin is full. Please empty it.";
        case "MopAttachmentReminderValetudoEvent": return "The mop is still attached to the robot.";
        case "MissingResourceValetudoEvent": return event.message ?? "A resource is missing.";
        case "ValetudoUpdatedValetudoEvent": return `Valetudo was updated from ${event.previousVersion ?? "unknown"} to ${event.newVersion ?? "unknown"}.`;
        case "ValetudoRuntimeErrorValetudoEvent": return event.description ?? `Valetudo reincarnated. Reason: ${event.reason ?? "unknown"}`;
        default: return `Unknown event type: ${event.__class}`;
    }
}

function act(event: ValetudoEvent, action: ValetudoEventInteraction["interaction"]) {
    if (!event.processed && !interaction.isPending.value) interaction.mutate({id: event.id, interaction: {interaction: action}});
}
</script>

<template>
    <Button :label="`Events${count ? ` (${count})` : ''}`" text aria-label="Events and notifications" @click="open = true" />
    <Drawer v-model:visible="open" header="Events" position="right" class="w-[min(95vw,28rem)]">
        <Button label="Refresh" text :loading="events.isFetching.value" @click="events.refetch()" />
        <p v-if="events.isPending.value" role="status">Loading events…</p>
        <Message v-else-if="events.isError.value || interaction.isError.value" severity="error">Unable to load or update events.</Message>
        <p v-else-if="!events.data.value?.length" class="muted mt-4">No events</p>
        <div v-for="event in events.data.value" :key="event.id" class="border-b py-4" style="border-color: var(--app-border)">
            <time class="muted text-xs" :datetime="event.timestamp">{{ new Date(event.timestamp).toLocaleString() }}</time>
            <p class="my-2" :class="{'muted line-through': event.processed}">{{ content(event) }}</p>
            <div v-if="!event.processed" class="flex gap-2">
                <template v-if="event.__class === 'PendingMapChangeValetudoEvent'"><Button label="Yes" size="small" :disabled="interaction.isPending.value" @click="act(event, 'yes')" /><Button label="No" size="small" outlined :disabled="interaction.isPending.value" @click="act(event, 'no')" /></template>
                <Button v-else-if="event.__class === 'ConsumableDepletedValetudoEvent'" label="Reset" size="small" :disabled="interaction.isPending.value" @click="act(event, 'reset')" />
                <Button v-else-if="['ErrorStateValetudoEvent', 'DustBinFullValetudoEvent', 'MopAttachmentReminderValetudoEvent', 'MissingResourceValetudoEvent', 'ValetudoUpdatedValetudoEvent', 'ValetudoRuntimeErrorValetudoEvent'].includes(event.__class)" label="Dismiss" size="small" :disabled="interaction.isPending.value" @click="act(event, 'ok')" />
            </div>
        </div>
    </Drawer>
</template>
