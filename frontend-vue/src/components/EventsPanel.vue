<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import Message from "primevue/message";
import {fetchValetudoEvents, sendValetudoEventInteraction} from "../api/client";
import type {ConsumableSubType, ConsumableType, ValetudoEvent, ValetudoEventInteraction} from "../api/types";
import {translate} from "../i18n";
import {consumableName} from "../i18n/labels";
import {formatDateTime} from "../statistics";

const queryClient = useQueryClient();
const events = useQuery({queryKey: ["valetudoEvents"], queryFn: fetchValetudoEvents, staleTime: 30000, refetchInterval: 30000});
const count = computed(() => events.data.value?.filter(event => !event.processed).length ?? 0);
const open = ref(false);
const interaction = useMutation({mutationFn: sendValetudoEventInteraction, onSuccess: () => queryClient.invalidateQueries({queryKey: ["valetudoEvents"]})});

function content(event: ValetudoEvent) {
    switch (event.__class) {
        case "ConsumableDepletedValetudoEvent": return translate("The {name} consumable is depleted.", {name: consumableName(event.type as ConsumableType | undefined, event.subType as ConsumableSubType | undefined)});
        case "ErrorStateValetudoEvent": return translate("An error occurred: {message}", {message: event.message || translate("Unknown error")});
        case "PendingMapChangeValetudoEvent": return translate("A map change is pending. Do you want to accept the new map?");
        case "DustBinFullValetudoEvent": return translate("The dust bin is full. Please empty it.");
        case "MopAttachmentReminderValetudoEvent": return translate("The mop is still attached to the robot.");
        case "MissingResourceValetudoEvent": return event.message ?? translate("A resource is missing.");
        case "ValetudoUpdatedValetudoEvent": return translate("Valetudo was updated from {before} to {after}.", {before: event.previousVersion ?? "unknown", after: event.newVersion ?? "unknown"});
        case "ValetudoRuntimeErrorValetudoEvent": return event.description ?? translate("Valetudo reincarnated. Reason: {reason}", {reason: event.reason ?? "unknown"});
        default: return translate("Unknown event type: {type}", {type: event.__class});
    }
}

function act(event: ValetudoEvent, action: ValetudoEventInteraction["interaction"]) {
    if (!event.processed && !interaction.isPending.value) interaction.mutate({id: event.id, interaction: {interaction: action}});
}
</script>

<template>
    <Button class="events-trigger" text :aria-label='$t("Events and notifications")' :title='$t("Events and notifications")' @click="open = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        <span v-if="count" class="events-count" aria-hidden="true">{{ count > 9 ? "9+" : count }}</span>
    </Button>
    <Drawer v-model:visible="open" :header='$t("Events")' position="right" class="w-[min(95vw,28rem)]">
        <Button :label='$t("Refresh")' text :loading="events.isFetching.value" @click="events.refetch()" />
        <p v-if="events.isPending.value" role="status">{{ $t("Loading events…") }}</p>
        <Message v-else-if="events.isError.value || interaction.isError.value" severity="error">{{ $t("Unable to load or update events.") }}</Message>
        <p v-else-if="!events.data.value?.length" class="muted mt-4">{{ $t("No events") }}</p>
        <div v-for="event in events.data.value" :key="event.id" class="border-b py-4" style="border-color: var(--app-border)">
            <time class="muted text-xs" :datetime="event.timestamp">{{ formatDateTime(event.timestamp) }}</time>
            <p class="my-2" :class="{'muted line-through': event.processed}">{{ content(event) }}</p>
            <div v-if="!event.processed" class="flex gap-2">
                <template v-if="event.__class === 'PendingMapChangeValetudoEvent'"><Button :label='$t("Yes")' size="small" :disabled="interaction.isPending.value" @click="act(event, 'yes')" /><Button :label='$t("No")' size="small" outlined :disabled="interaction.isPending.value" @click="act(event, 'no')" /></template>
                <Button v-else-if="event.__class === 'ConsumableDepletedValetudoEvent'" :label='$t("Reset")' size="small" :disabled="interaction.isPending.value" @click="act(event, 'reset')" />
                <Button v-else-if="['ErrorStateValetudoEvent', 'DustBinFullValetudoEvent', 'MopAttachmentReminderValetudoEvent', 'MissingResourceValetudoEvent', 'ValetudoUpdatedValetudoEvent', 'ValetudoRuntimeErrorValetudoEvent'].includes(event.__class)" :label='$t("Dismiss")' size="small" :disabled="interaction.isPending.value" @click="act(event, 'ok')" />
            </div>
        </div>
    </Drawer>
</template>
