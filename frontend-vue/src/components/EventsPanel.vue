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
import AppIcon from "./AppIcon.vue";
import type {IconName} from "./icons";

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

const pending = computed(() => (events.data.value ?? []).filter(event => !event.processed));
const processed = computed(() => (events.data.value ?? []).filter(event => event.processed));
const dismissible = ["ErrorStateValetudoEvent", "DustBinFullValetudoEvent", "MopAttachmentReminderValetudoEvent", "MissingResourceValetudoEvent", "ValetudoUpdatedValetudoEvent", "ValetudoRuntimeErrorValetudoEvent"];

function tone(event: ValetudoEvent): "error" | "warn" | "info" {
    if (["ErrorStateValetudoEvent", "ValetudoRuntimeErrorValetudoEvent", "MissingResourceValetudoEvent"].includes(event.__class)) return "error";
    if (["ConsumableDepletedValetudoEvent", "DustBinFullValetudoEvent", "MopAttachmentReminderValetudoEvent"].includes(event.__class)) return "warn";
    return "info";
}

function icon(event: ValetudoEvent): IconName {
    switch (event.__class) {
        case "PendingMapChangeValetudoEvent": return "map";
        case "ConsumableDepletedValetudoEvent": return "consumables";
        case "DustBinFullValetudoEvent": return "consumables";
        case "ValetudoUpdatedValetudoEvent": return "refresh";
        default: return tone(event) === "error" ? "alert" : "info";
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
    <Drawer v-model:visible="open" position="right" class="events-drawer w-[min(95vw,26rem)]">
        <template #header>
            <div class="events-header">
                <strong>{{ $t("Events") }}</strong>
                <span v-if="count" class="events-header-count">{{ count }}</span>
                <button type="button" class="events-refresh" :class="{'events-refresh--busy': events.isFetching.value}" :aria-label='$t("Refresh")' :title='$t("Refresh")' @click="events.refetch()"><AppIcon name="refresh" /></button>
            </div>
        </template>
        <p v-if="events.isPending.value" class="muted" role="status">{{ $t("Loading events…") }}</p>
        <Message v-else-if="events.isError.value" severity="error">{{ $t("Unable to load or update events.") }}</Message>
        <div v-else-if="!events.data.value?.length" class="events-empty">
            <span class="events-icon"><AppIcon name="bell" /></span>
            <p>{{ $t("No events") }}</p>
        </div>
        <template v-else>
            <Message v-if="interaction.isError.value" severity="error" class="mb-3">{{ $t("Unable to load or update events.") }}</Message>
            <template v-for="group in [{title: 'New', items: pending}, {title: 'Viewed', items: processed}]" :key="group.title">
                <section v-if="group.items.length" class="events-group">
                    <h3>{{ $t(group.title) }}</h3>
                    <article v-for="event in group.items" :key="event.id" class="event-card" :class="{'event-card--done': event.processed}">
                        <span class="events-icon" :class="`events-icon--${event.processed ? 'done' : tone(event)}`"><AppIcon :name="icon(event)" /></span>
                        <div class="min-w-0 flex-1">
                            <p class="event-text">{{ content(event) }}</p>
                            <time class="event-time" :datetime="event.timestamp">{{ formatDateTime(event.timestamp) }}</time>
                            <div v-if="!event.processed" class="event-actions">
                                <template v-if="event.__class === 'PendingMapChangeValetudoEvent'"><Button :label='$t("Yes")' size="small" :disabled="interaction.isPending.value" @click="act(event, 'yes')" /><Button :label='$t("No")' size="small" outlined :disabled="interaction.isPending.value" @click="act(event, 'no')" /></template>
                                <Button v-else-if="event.__class === 'ConsumableDepletedValetudoEvent'" :label='$t("Reset")' size="small" outlined :disabled="interaction.isPending.value" @click="act(event, 'reset')" />
                                <Button v-else-if="dismissible.includes(event.__class)" :label='$t("Dismiss")' size="small" outlined :disabled="interaction.isPending.value" @click="act(event, 'ok')" />
                            </div>
                        </div>
                    </article>
                </section>
            </template>
        </template>
    </Drawer>
</template>

<style scoped>
.events-header { display: flex; flex: 1; align-items: center; gap: 8px; }
.events-header strong { font: 700 var(--text-lg) var(--font-heading); }
.events-header-count { min-width: 22px; padding: 1px 7px; border-radius: 11px; background: var(--app-accent); color: var(--app-on-accent); font-size: var(--text-xs); font-weight: 700; text-align: center; }
.events-refresh { display: grid; width: 36px; height: 36px; margin-left: auto; place-items: center; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--app-secondary); cursor: pointer; }
.events-refresh:hover { background: var(--app-accent-soft); color: var(--app-accent); }
.events-refresh .app-icon { width: 18px; height: 18px; }
.events-refresh--busy .app-icon { animation: events-spin 1s linear infinite; }
@keyframes events-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .events-refresh--busy .app-icon { animation: none; } }
.events-empty { display: grid; justify-items: center; gap: 10px; padding: 48px 0; color: var(--app-muted); }
.events-empty p { margin: 0; }
.events-group + .events-group { margin-top: 20px; }
.events-group h3 { margin: 0 0 8px; color: var(--app-muted); font-size: var(--text-xs); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.event-card { display: flex; gap: 12px; padding: 12px; border: 1px solid var(--app-border); border-radius: var(--radius-md); background: var(--app-surface); }
.event-card + .event-card { margin-top: 8px; }
.event-card--done { background: var(--app-surface-soft); }
.event-card--done .event-text { color: var(--app-muted); }
.event-text { margin: 0; font-size: var(--text-sm); line-height: 1.4; overflow-wrap: anywhere; }
.event-time { display: block; margin-top: 4px; color: var(--app-muted); font-size: var(--text-xs); }
.event-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.events-icon { display: grid; flex: none; width: 36px; height: 36px; place-items: center; border-radius: var(--radius-sm); background: var(--app-accent-soft); color: var(--app-accent); }
.events-icon .app-icon { width: 18px; height: 18px; }
.events-icon--error { background: var(--status-error-bg); color: var(--status-error-text); }
.events-icon--warn { background: var(--status-paused-bg); color: var(--status-paused-text); }
.events-icon--done { background: var(--app-surface-raised); color: var(--app-muted); }
</style>
