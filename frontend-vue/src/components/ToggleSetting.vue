<script setup lang="ts">
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import type {SimpleToggleState} from "../../../frontend/src/api/types";

const props = defineProps<{name: string; description?: string; queryKey: string; fetchState: () => Promise<SimpleToggleState>; updateState: (enabled: boolean) => Promise<void>}>();
const queryClient = useQueryClient();
const state = useQuery({queryKey: ["toggle", props.queryKey], queryFn: props.fetchState});
const mutation = useMutation({mutationFn: props.updateState, onSuccess: () => queryClient.invalidateQueries({queryKey: ["toggle", props.queryKey]})});
</script>

<template>
    <div class="border-b py-4" style="border-color: var(--app-border)">
        <label class="flex items-center justify-between gap-4"><span><span class="block font-semibold">{{ name }}</span><span v-if="description" class="muted text-sm">{{ description }}</span></span><Checkbox :model-value="state.data.value?.enabled ?? false" binary :disabled="state.isPending.value || state.isError.value || mutation.isPending.value" @update:model-value="mutation.mutate(Boolean($event))" /></label>
        <Message v-if="state.isError.value || mutation.isError.value" severity="error" class="mt-2">Unable to load or update {{ name.toLowerCase() }}.</Message>
    </div>
</template>
