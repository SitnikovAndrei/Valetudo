<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Select from "primevue/select";
import Message from "primevue/message";

const props = defineProps<{
    name: string;
    description?: string;
    queryKey: string;
    fetchValue: () => Promise<string>;
    fetchOptions: () => Promise<string[]>;
    updateValue: (value: string) => Promise<void>;
}>();
const queryClient = useQueryClient();
const value = useQuery({queryKey: ["select", props.queryKey], queryFn: props.fetchValue});
const options = useQuery({queryKey: ["selectOptions", props.queryKey], queryFn: props.fetchOptions});
const mutation = useMutation({mutationFn: props.updateValue, onSuccess: () => queryClient.invalidateQueries({queryKey: ["select", props.queryKey]})});
const choices = computed(() => (options.data.value ?? []).map(option => ({label: option.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()), value: option})));
</script>

<template>
    <div class="border-b py-4" style="border-color: var(--app-border)">
        <label class="flex flex-wrap items-center justify-between gap-4"><span><span class="block font-semibold">{{ name }}</span><span v-if="description" class="muted text-sm">{{ description }}</span></span><Select :model-value="value.data.value" :options="choices" option-label="label" option-value="value" :aria-label="name" :disabled="value.isPending.value || options.isPending.value || value.isError.value || options.isError.value || mutation.isPending.value" @update:model-value="mutation.mutate(String($event))" /></label>
        <Message v-if="value.isError.value || options.isError.value || mutation.isError.value" severity="error" class="mt-2">Unable to load or update {{ name.toLowerCase() }}.</Message>
    </div>
</template>
