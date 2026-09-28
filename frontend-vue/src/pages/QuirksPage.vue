<script setup lang="ts">
import {computed} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import ToggleSwitch from "primevue/toggleswitch";
import SettingsSection from "../components/SettingsSection.vue";
import SettingRow from "../components/SettingRow.vue";
import {quirkKind} from "../quirkKind";
import {fetchQuirks, sendSetQuirkValueCommand} from "../api/client";
import {locale, translate} from "../i18n";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";

const queryClient = useQueryClient();
const quirks = useQuery({queryKey: ["quirks"], queryFn: fetchQuirks});
const sorted = computed(() => [...(quirks.data.value ?? [])].sort((a, b) => translate(a.title).localeCompare(translate(b.title), locale.value)));
const sections = computed(() => [
    {title: translate("Quirk parameters"), quirks: sorted.value.filter(quirk => quirkKind(quirk.options) !== "action")},
    {title: translate("Dock and maintenance actions"), quirks: sorted.value.filter(quirk => quirkKind(quirk.options) === "action")}
].filter(section => section.quirks.length));
const setQuirk = useMutation({mutationFn: sendSetQuirkValueCommand, onSuccess: () => queryClient.invalidateQueries({queryKey: ["quirks"]})});
</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Quirks')">
            <template #actions><Button :label='$t("Refresh")' text :loading="quirks.isFetching.value" @click="quirks.refetch()" /></template>
        </PageHeader>
        <p v-if="quirks.isPending.value" role="status">{{ $t("Loading quirks…") }}</p>
        <Message v-else-if="quirks.isError.value || setQuirk.isError.value" severity="error">{{ $t("Unable to load or save quirks.") }}</Message>
        <p v-else-if="!sorted.length" class="muted">{{ $t("No quirks reported.") }}</p>
        <SettingsSection v-for="section in sections" :key="section.title" :title="section.title" class="mb-4">
            <SettingRow v-for="quirk in section.quirks" :key="quirk.id" :name="$t(quirk.title)" :description="$t(quirk.description)">
                <ToggleSwitch v-if="quirkKind(quirk.options) === 'toggle'" :model-value="quirk.value === 'on'" :aria-label="$t(quirk.title)" :disabled="setQuirk.isPending.value" @update:model-value="value => setQuirk.mutate({id: quirk.id, value: value ? 'on' : 'off'})" />
                <Button v-else-if="quirkKind(quirk.options) === 'action'" :label='$t("Run")' :loading="setQuirk.isPending.value && setQuirk.variables.value?.id === quirk.id" :disabled="setQuirk.isPending.value" @click="setQuirk.mutate({id: quirk.id, value: 'trigger'})" />
                <SelectButton v-else-if="quirkKind(quirk.options) === 'segmented'" :model-value="quirk.value" :options="quirk.options.map(value => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :allow-empty="false" :aria-label="$t(quirk.title)" :disabled="setQuirk.isPending.value" @update:model-value="value => setQuirk.mutate({id: quirk.id, value})" />
                <Select v-else :model-value="quirk.value" :options="quirk.options.map(value => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :aria-label="$t(quirk.title)" :disabled="setQuirk.isPending.value" @update:model-value="value => setQuirk.mutate({id: quirk.id, value})" />
                <small v-if="quirkKind(quirk.options) === 'toggle' && quirk.value !== 'on' && quirk.value !== 'off'" class="muted mt-2 block">{{ valueLabel(quirk.value) }}</small>
            </SettingRow>
        </SettingsSection>
    </div>
</template>
