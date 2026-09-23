<script setup lang="ts">
import {ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import {fetchConsumableProperties, fetchConsumableStateInformation, sendConsumableReset} from "../../../frontend/src/api/client";
import type {ConsumableMeta} from "../../../frontend/src/api/types";

const properties = useQuery({queryKey: ["consumableProperties"], queryFn: fetchConsumableProperties});
const states = useQuery({queryKey: ["consumableStates"], queryFn: fetchConsumableStateInformation});
const queryClient = useQueryClient();
const selected = ref<ConsumableMeta>();
const reset = useMutation({
    mutationFn: sendConsumableReset,
    onSuccess: async () => {
        selected.value = undefined;
        await queryClient.invalidateQueries({queryKey: ["consumableStates"]});
    }
});

function name(consumable: ConsumableMeta) {
    return [consumable.subType !== "none" ? consumable.subType.replace(/_/g, " ") : "", consumable.type].filter(Boolean).join(" ");
}

function remaining(consumable: ConsumableMeta) {
    return states.data.value?.find(state => state.type === consumable.type && state.subType === consumable.subType)?.remaining;
}

function percentage(consumable: ConsumableMeta) {
    const value = remaining(consumable)?.value;
    if (value === undefined) return undefined;
    const max = consumable.unit === "percent" ? 100 : consumable.maxValue;
    return max ? Math.min(100, Math.max(0, Math.round(value / max * 100))) : undefined;
}
</script>

<template>
    <section class="panel">
        <h1 class="text-2xl font-bold">Consumables</h1>
        <p class="muted mt-1">Monitor and reset consumable states</p>
        <p v-if="properties.isPending.value || states.isPending.value" role="status" class="mt-5">Loading consumables…</p>
        <Message v-else-if="properties.isError.value || states.isError.value" severity="error" class="mt-5">Unable to load consumables. <Button label="Retry" text @click="properties.refetch(); states.refetch()" /></Message>
        <p v-else-if="!properties.data.value?.availableConsumables.length" class="muted mt-5">No consumables reported.</p>
        <div v-for="consumable in properties.data.value?.availableConsumables" :key="`${consumable.type}_${consumable.subType}`" class="border-b py-4" style="border-color: var(--app-border)">
            <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                    <h2 class="font-semibold capitalize">{{ name(consumable) }}</h2>
                    <p v-if="remaining(consumable)" class="muted text-sm">{{ remaining(consumable)?.value }} {{ remaining(consumable)?.unit }}</p>
                    <ProgressBar v-if="percentage(consumable) !== undefined" :value="percentage(consumable)" :show-value="false" class="mt-2" />
                </div>
                <Button label="Reset" outlined :disabled="reset.isPending.value" @click="selected = consumable" />
            </div>
        </div>
        <Message v-if="reset.isError.value" severity="error" class="mt-4">Reset failed.</Message>
        <Dialog :visible="Boolean(selected)" modal header="Reset consumable?" class="max-w-md" @update:visible="selected = undefined">
            <p>Do you really want to reset the {{ selected ? name(selected) : "" }} consumable?</p>
            <div class="mt-5 flex justify-end gap-2">
                <Button label="Cancel" text @click="selected = undefined" />
                <Button label="Reset" :loading="reset.isPending.value" @click="selected && reset.mutate({type: selected.type, subType: selected.subType})" />
            </div>
        </Dialog>
    </section>
</template>
