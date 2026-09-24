<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import {fetchNTPClientConfiguration, fetchNTPClientStatus, sendNTPClientConfiguration} from "../api/client";
import type {NTPClientConfiguration} from "../api/types";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";

const queryClient = useQueryClient();
const config = useQuery({queryKey: ["ntpConfig"], queryFn: fetchNTPClientConfiguration});
const status = useQuery({queryKey: ["ntpStatus"], queryFn: fetchNTPClientStatus});
const draft = ref<NTPClientConfiguration>({enabled: false, server: "", port: 123, interval: 0, timeout: 0});
watch(config.data, value => {if (value) draft.value = {...value};}, {immediate: true});
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(config.data.value));
const intervalHours = computed({get: () => draft.value.interval / 3600000, set: value => {draft.value.interval = value * 3600000;}});
const timeoutSeconds = computed({get: () => draft.value.timeout / 1000, set: value => {draft.value.timeout = value * 1000;}});
const save = useMutation({mutationFn: sendNTPClientConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["ntpConfig"]})});
</script>

<template>
    <div class="page max-w-2xl">
        <PageHeader :title="$t('NTP connectivity')" />
        <section class="panel">
            <p v-if="config.isPending.value" role="status">{{ $t("Loading configuration…") }}</p>
            <Message v-else-if="config.isError.value" severity="error">{{ $t("Configuration unavailable.") }} <Button :label='$t("Retry")' text @click="config.refetch()" /></Message>
            <form v-else class="flex flex-col gap-4" @submit.prevent="save.mutate({...draft})">
                <p v-if="status.data.value">{{ $t("State:") }} {{ valueLabel(status.data.value.state.__class) }} · {{ $t("Robot time:") }} {{ status.data.value.robotTime }}</p>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.enabled" binary /> {{ $t("Enable NTP client") }}</label>
                <label class="flex flex-col gap-1">{{ $t("Server") }} <InputText v-model="draft.server" :disabled="!draft.enabled" required /></label>
                <label class="flex flex-col gap-1">{{ $t("Port") }} <InputNumber v-model="draft.port" :disabled="!draft.enabled" :min="1" :max="65535" :use-grouping="false" required /></label>
                <label class="flex flex-col gap-1">{{ $t("Interval (hours)") }} <InputNumber v-model="intervalHours" :disabled="!draft.enabled" :min="1" :max="24" :use-grouping="false" required /></label>
                <label class="flex flex-col gap-1">{{ $t("Timeout (seconds)") }} <InputNumber v-model="timeoutSeconds" :disabled="!draft.enabled" :min="5" :max="60" :use-grouping="false" required /></label>
                <Message v-if="save.isError.value" severity="error">{{ $t("Unable to save configuration.") }}</Message>
                <Button type="submit" :label='$t("Save configuration")' :disabled="!dirty || save.isPending.value" :loading="save.isPending.value" />
            </form>
        </section>
    </div>
</template>
