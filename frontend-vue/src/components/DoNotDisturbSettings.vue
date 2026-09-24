<script setup lang="ts">
import {ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import {cloneJson} from "../cloneJson";
import type {DoNotDisturbConfiguration} from "../api/types";
import {fetchDoNotDisturbConfiguration, sendDoNotDisturbConfiguration} from "../api/client";
import SettingsSection from "./SettingsSection.vue";
import SettingRow from "./SettingRow.vue";
import AsyncState from "./AsyncState.vue";
import TimeInput from "./TimeInput.vue";

const queryClient = useQueryClient();
const dnd = useQuery({queryKey: ["dndConfiguration"], queryFn: fetchDoNotDisturbConfiguration});
const draft = ref<DoNotDisturbConfiguration>({enabled: false, start: {hour: 0, minute: 0}, end: {hour: 0, minute: 0}});
const start = ref("00:00");
const end = ref("00:00");
watch(dnd.data, value => {
    if (!value) return;
    draft.value = cloneJson(value);
    const local = (utc: {hour: number; minute: number}) => {const date = new Date(); date.setUTCHours(utc.hour, utc.minute, 0, 0); return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;};
    start.value = local(value.start);
    end.value = local(value.end);
}, {immediate: true});
const save = useMutation({mutationFn: sendDoNotDisturbConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["dndConfiguration"]})});

function apply() {
    const converted = cloneJson(draft.value);
    const toUTC = (text: string) => {const [hour, minute] = text.split(":").map(Number); const date = new Date(); date.setHours(hour, minute, 0, 0); return {hour: date.getUTCHours(), minute: date.getUTCMinutes()};};
    converted.start = toUTC(start.value);
    converted.end = toUTC(end.value);
    save.mutate(converted);
}
</script>

<template>
    <SettingsSection :title='$t("Do not disturb")' :description='$t("The behavior depends on the robot model.")'>
        <AsyncState :loading="dnd.isPending.value" :error="dnd.isError.value" :error-text='$t("Do not disturb request failed.")' @retry="dnd.refetch()">
            <SettingRow :name='$t("Enabled")'><Checkbox v-model="draft.enabled" binary :aria-label='$t("Do not disturb")' /></SettingRow>
            <SettingRow :name='$t("Quiet hours")'>
                <div class="flex flex-wrap gap-3">
                    <label class="flex flex-col gap-1 text-xs muted">{{ $t("Start") }}<TimeInput v-model="start" :disabled="!draft.enabled" :label='$t("Start")' /></label>
                    <label class="flex flex-col gap-1 text-xs muted">{{ $t("End") }}<TimeInput v-model="end" :disabled="!draft.enabled" :label='$t("End")' /></label>
                </div>
            </SettingRow>
            <div class="mt-4 flex justify-end"><Button :label='$t("Apply")' :loading="save.isPending.value" @click="apply" /></div>
            <Message v-if="save.isError.value" severity="error" class="mt-3">{{ $t("Do not disturb request failed.") }}</Message>
        </AsyncState>
    </SettingsSection>
</template>
