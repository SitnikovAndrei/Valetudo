<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Select from "primevue/select";
import Message from "primevue/message";
import {valueLabel} from "../i18n/labels";
import SettingRow from "./SettingRow.vue";

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
const choices = computed(() => (options.data.value ?? []).map(option => ({label: valueLabel(option), value: option})));
</script>

<template>
    <SettingRow :name="name" :description="description">
        <Select :model-value="value.data.value" :options="choices" option-label="label" option-value="value" :aria-label="name" :disabled="value.isPending.value || options.isPending.value || value.isError.value || options.isError.value || mutation.isPending.value" @update:model-value="mutation.mutate(String($event))" />
        <Message v-if="value.isError.value || options.isError.value || mutation.isError.value" severity="error" class="mt-2">{{ $t("Unable to load or update {name}.", {name}) }}</Message>
    </SettingRow>
</template>
