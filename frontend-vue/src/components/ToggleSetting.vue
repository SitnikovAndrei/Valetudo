<script setup lang="ts">
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import type {SimpleToggleState} from "../api/types";
import SettingRow from "./SettingRow.vue";

const props = defineProps<{name: string; description?: string; queryKey: string; fetchState: () => Promise<SimpleToggleState>; updateState: (enabled: boolean) => Promise<void>}>();
const queryClient = useQueryClient();
const state = useQuery({queryKey: ["toggle", props.queryKey], queryFn: props.fetchState});
const mutation = useMutation({mutationFn: props.updateState, onSuccess: () => queryClient.invalidateQueries({queryKey: ["toggle", props.queryKey]})});
</script>

<template>
    <SettingRow :name="name" :description="description">
        <Checkbox :model-value="state.data.value?.enabled ?? false" binary :aria-label="name" :disabled="state.isPending.value || state.isError.value || mutation.isPending.value" @update:model-value="mutation.mutate(Boolean($event))" />
        <Message v-if="state.isError.value || mutation.isError.value" severity="error" class="mt-2">{{ $t("Unable to load or update {name}.", {name}) }}</Message>
    </SettingRow>
</template>
