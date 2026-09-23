<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import {fetchQuirks, sendSetQuirkValueCommand} from "../../../frontend/src/api/client";

const queryClient = useQueryClient();
const quirks = useQuery({queryKey: ["quirks"], queryFn: fetchQuirks});
const sorted = computed(() => [...(quirks.data.value ?? [])].sort((a, b) => a.title.localeCompare(b.title)));
const setQuirk = useMutation({mutationFn: sendSetQuirkValueCommand, onSuccess: () => queryClient.invalidateQueries({queryKey: ["quirks"]})});
</script>

<template>
    <section class="panel">
        <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">{{ $t("Quirks") }}</h1><Button :label='$t("Refresh")' text :loading="quirks.isFetching.value" @click="quirks.refetch()" /></div>
        <p v-if="quirks.isPending.value" role="status">{{ $t("Loading quirks…") }}</p>
        <Message v-else-if="quirks.isError.value || setQuirk.isError.value" severity="error">{{ $t("Unable to load or save quirks.") }}</Message>
        <p v-else-if="!sorted.length" class="muted">{{ $t("No quirks reported.") }}</p>
        <div v-for="quirk in sorted" :key="quirk.id" class="mb-4 rounded-lg border p-4" style="border-color: var(--app-border)">
            <label class="flex flex-col gap-2"><span class="font-semibold">{{ quirk.title }}</span><Select :model-value="quirk.value" :options="quirk.options" :disabled="setQuirk.isPending.value" @update:model-value="value => setQuirk.mutate({id: quirk.id, value})" /></label>
            <p class="muted mt-3 text-sm">{{ quirk.description }}</p>
        </div>
    </section>
</template>
