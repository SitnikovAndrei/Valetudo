<script setup lang="ts">
import {consumableName, valueLabel} from "../i18n/labels";
import {ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import {fetchConsumableProperties, fetchConsumableStateInformation, sendConsumableReset} from "../api/client";
import type {ConsumableMeta} from "../api/types";
import {formatMinutes} from "../formatDuration";
import {i18n} from "../i18n";

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
    return consumableName(consumable.type, consumable.subType);
}

function remaining(consumable: ConsumableMeta) {
    return states.data.value?.find(state => state.type === consumable.type && state.subType === consumable.subType)?.remaining;
}

function remainingLabel(consumable: ConsumableMeta): string {
    const state = remaining(consumable);
    if (!state) return "";
    return state.unit === "minutes" ? formatMinutes(state.value, i18n.global.locale.value) : `${state.value} ${valueLabel(state.unit)}`;
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
        <h1 class="text-2xl font-bold">{{ $t("Consumables") }}</h1>
        <p class="muted mt-1">{{ $t("Monitor and reset consumable states") }}</p>
        <p v-if="properties.isPending.value || states.isPending.value" role="status" class="mt-5">{{ $t("Loading consumables…") }}</p>
        <Message v-else-if="properties.isError.value || states.isError.value" severity="error" class="mt-5">{{ $t("Unable to load consumables.") }} <Button :label='$t("Retry")' text @click="properties.refetch(); states.refetch()" /></Message>
        <p v-else-if="!properties.data.value?.availableConsumables.length" class="muted mt-5">{{ $t("No consumables reported.") }}</p>
        <div v-for="consumable in properties.data.value?.availableConsumables" :key="`${consumable.type}_${consumable.subType}`" class="border-b py-4" style="border-color: var(--app-border)">
            <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                    <h2 class="font-semibold">{{ name(consumable) }}</h2>
                    <p v-if="remaining(consumable)" class="muted text-sm">{{ remainingLabel(consumable) }}</p>
                    <ProgressBar v-if="percentage(consumable) !== undefined" :value="percentage(consumable)" :show-value="false" class="mt-2" />
                </div>
                <Button :label='$t("Reset")' outlined :disabled="reset.isPending.value" @click="selected = consumable" />
            </div>
        </div>
        <Message v-if="reset.isError.value" severity="error" class="mt-4">{{ $t("Reset failed.") }}</Message>
        <Dialog :visible="Boolean(selected)" modal :header='$t("Reset consumable?")' class="max-w-md" @update:visible="selected = undefined">
            <p>{{ $t("Do you really want to reset the {name} consumable?", {name: selected ? name(selected) : ""}) }}</p>
            <div class="mt-5 flex justify-end gap-2">
                <Button :label='$t("Cancel")' text @click="selected = undefined" />
                <Button :label='$t("Reset")' :loading="reset.isPending.value" @click="selected && reset.mutate({type: selected.type, subType: selected.subType})" />
            </div>
        </Dialog>
    </section>
</template>
