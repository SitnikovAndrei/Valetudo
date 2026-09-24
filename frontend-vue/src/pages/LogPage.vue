<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import {fetchValetudoLog, fetchValetudoLogLevel, sendValetudoLogLevel, subscribeToLogMessages} from "../api/client";
import type {LogLevel} from "../api/types";
import {valueLabel} from "../i18n/labels";

const queryClient = useQueryClient();
const log = useQuery({queryKey: ["valetudoLog"], queryFn: fetchValetudoLog, staleTime: Infinity});
const level = useQuery({queryKey: ["valetudoLogLevel"], queryFn: fetchValetudoLogLevel});
const changeLevel = useMutation({mutationFn: sendValetudoLogLevel, onSuccess: () => queryClient.invalidateQueries({queryKey: ["valetudoLogLevel"]})});
const filter = ref("");
const lines = computed(() => (log.data.value ?? "").split("\n").filter(line => line.toLowerCase().includes(filter.value.toLowerCase())));
let unsubscribe: (() => void) | undefined;
onMounted(() => {
    unsubscribe = subscribeToLogMessages(message => queryClient.setQueryData<string>(["valetudoLog"], current => current ? `${current.trim()}\n${message}` : message));
});
onBeforeUnmount(() => unsubscribe?.());

function refresh() {
    void log.refetch();
    void level.refetch();
}
</script>

<template>
    <section class="panel">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Log") }}</h1>
        <div class="mb-5 flex flex-wrap items-center gap-3">
            <label class="flex flex-1 flex-col gap-1">{{ $t("Filter") }} <input v-model="filter" type="search" class="rounded-lg border p-2" style="background: var(--app-surface); border-color: var(--app-border)" /></label>
            <label class="flex flex-col gap-1">{{ $t("Current level") }} <Select :model-value="level.data.value?.current" :options="(level.data.value?.presets ?? []).map(value => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :disabled="level.isPending.value || changeLevel.isPending.value" @update:model-value="value => changeLevel.mutate({level: value as LogLevel})" /></label>
            <Button :label='$t("Refresh")' :loading="log.isFetching.value" outlined @click="refresh" />
        </div>
        <p v-if="log.isPending.value" role="status">{{ $t("Loading log…") }}</p>
        <Message v-else-if="log.isError.value || level.isError.value || changeLevel.isError.value" severity="error">{{ $t("Unable to load or change the log.") }}</Message>
        <pre v-else class="max-h-[65vh] overflow-auto rounded-lg p-4 text-xs leading-relaxed" style="background: var(--app-bg)">{{ lines.join("\n") }}</pre>
    </section>
</template>
