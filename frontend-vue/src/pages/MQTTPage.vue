<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {cloneJson} from "../cloneJson";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import Textarea from "primevue/textarea";
import {fetchMQTTConfiguration, fetchMQTTProperties, fetchMQTTStatus, sendMQTTConfiguration} from "../../../frontend/src/api/client";
import type {MQTTConfiguration} from "../../../frontend/src/api/types";

const queryClient = useQueryClient();
const config = useQuery({queryKey: ["mqttConfiguration"], queryFn: fetchMQTTConfiguration});
const status = useQuery({queryKey: ["mqttStatus"], queryFn: fetchMQTTStatus});
const properties = useQuery({queryKey: ["mqttProperties"], queryFn: fetchMQTTProperties});
const draft = ref<MQTTConfiguration>();
watch(config.data, value => {if (value) draft.value = cloneJson(value);}, {immediate: true});
const dirty = computed(() => draft.value !== undefined && JSON.stringify(draft.value) !== JSON.stringify(config.data.value));
const valid = computed(() => !draft.value?.enabled || Boolean(
    draft.value.connection.host.trim() && draft.value.connection.port >= 1 && draft.value.connection.port <= 65535 &&
    (!draft.value.connection.authentication.credentials.enabled || draft.value.connection.authentication.credentials.username.trim()) &&
    (!draft.value.connection.authentication.clientCertificate.enabled || (draft.value.connection.authentication.clientCertificate.certificate.trim() && draft.value.connection.authentication.clientCertificate.key.trim()))
));
const save = useMutation({mutationFn: sendMQTTConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["mqttConfiguration"]})});
function normalizeIdentifier() {if (draft.value) draft.value.identity.identifier = draft.value.identity.identifier.replace(/[^a-zA-Z0-9_-]/g, "");}
function normalizePrefix() {if (draft.value) draft.value.customizations.topicPrefix = draft.value.customizations.topicPrefix.replace(/[^a-zA-Z0-9_\-/]/g, "").replace(/\/{2,}/g, "/");}
function submit() {
    if (!draft.value || !dirty.value || !valid.value) return;
    const value = cloneJson(draft.value);
    value.customizations.topicPrefix = value.customizations.topicPrefix.replace(/^\//, "").replace(/\/$/, "");
    save.mutate(value);
}
</script>

<template>
    <section class="panel max-w-4xl">
        <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">MQTT connectivity</h1><Button label="Refresh status" text :loading="status.isFetching.value" @click="status.refetch()" /></div>
        <p v-if="config.isPending.value || properties.isPending.value" role="status">Loading MQTT configuration…</p>
        <Message v-else-if="config.isError.value || properties.isError.value" severity="error">MQTT configuration unavailable. <Button label="Retry" text @click="config.refetch(); properties.refetch()" /></Message>
        <form v-else-if="draft" class="grid gap-5" @submit.prevent="submit">
            <div class="rounded-lg border p-4" style="border-color: var(--app-border)"><h2 class="font-semibold">Status: {{ status.data.value?.state ?? 'unavailable' }}</h2><p v-if="status.data.value" class="muted text-sm">Messages sent: {{ status.data.value.stats.messages.count.sent }} · received: {{ status.data.value.stats.messages.count.received }} · reconnects: {{ status.data.value.stats.connection.reconnects }} · errors: {{ status.data.value.stats.connection.errors }}</p></div>
            <label class="flex items-center gap-2"><Checkbox v-model="draft.enabled" binary /> MQTT enabled</label>
            <fieldset class="grid gap-3 border-t pt-4" style="border-color: var(--app-border)"><legend class="font-semibold">Connection</legend>
                <label class="flex flex-col gap-1">Broker host <InputText v-model="draft.connection.host" required /></label>
                <label class="flex flex-col gap-1">Port <InputNumber v-model="draft.connection.port" :min="1" :max="65535" :use-grouping="false" required /></label>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.connection.tls.enabled" binary /> TLS</label>
                <template v-if="draft.connection.tls.enabled"><label class="flex flex-col gap-1">Certificate authority <Textarea v-model="draft.connection.tls.ca" rows="3" /></label><label class="flex items-center gap-2"><Checkbox v-model="draft.connection.tls.ignoreCertificateErrors" binary /> Ignore certificate errors</label></template>
            </fieldset>
            <fieldset class="grid gap-3 border-t pt-4" style="border-color: var(--app-border)"><legend class="font-semibold">Authentication</legend>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.connection.authentication.credentials.enabled" binary /> Username and password</label>
                <template v-if="draft.connection.authentication.credentials.enabled"><label class="flex flex-col gap-1">Username <InputText v-model="draft.connection.authentication.credentials.username" required /></label><label class="flex flex-col gap-1">Password <Password v-model="draft.connection.authentication.credentials.password" :feedback="false" toggle-mask /></label></template>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.connection.authentication.clientCertificate.enabled" binary /> Client certificate</label>
                <template v-if="draft.connection.authentication.clientCertificate.enabled"><label class="flex flex-col gap-1">Certificate <Textarea v-model="draft.connection.authentication.clientCertificate.certificate" rows="3" required /></label><label class="flex flex-col gap-1">Key <Textarea v-model="draft.connection.authentication.clientCertificate.key" rows="3" required /></label></template>
            </fieldset>
            <fieldset class="grid gap-3 border-t pt-4" style="border-color: var(--app-border)"><legend class="font-semibold">Integrations</legend>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.interfaces.homeassistant.enabled" binary /> Home Assistant</label><label v-if="draft.interfaces.homeassistant.enabled" class="flex items-center gap-2"><Checkbox v-model="draft.interfaces.homeassistant.cleanAutoconfOnShutdown" binary /> Delete discovery metadata on shutdown</label>
                <label class="flex items-center gap-2"><Checkbox v-model="draft.interfaces.homie.enabled" binary /> Homie</label><label v-if="draft.interfaces.homie.enabled" class="flex items-center gap-2"><Checkbox v-model="draft.interfaces.homie.cleanAttributesOnShutdown" binary /> Delete attributes on shutdown</label>
            </fieldset>
            <fieldset class="grid gap-3 border-t pt-4" style="border-color: var(--app-border)"><legend class="font-semibold">Customizations</legend>
                <label class="flex flex-col gap-1">Topic prefix <InputText v-model="draft.customizations.topicPrefix" :placeholder="properties.data.value?.defaults.customizations.topicPrefix" @input="normalizePrefix" /></label>
                <label class="flex flex-col gap-1">Identifier <InputText v-model="draft.identity.identifier" :placeholder="properties.data.value?.defaults.identity.identifier" @input="normalizeIdentifier" /></label>
                <p class="muted break-all text-sm">{{ draft.customizations.topicPrefix || properties.data.value?.defaults.customizations.topicPrefix }}/{{ draft.identity.identifier || properties.data.value?.defaults.identity.identifier }}/BatteryStateAttribute/level</p>
            </fieldset>
            <fieldset v-if="properties.data.value?.optionalExposableCapabilities.length" class="border-t pt-4" style="border-color: var(--app-border)"><legend class="mb-2 font-semibold">Optional capabilities</legend><div class="grid gap-2 sm:grid-cols-2"><label v-for="capability in properties.data.value.optionalExposableCapabilities" :key="capability" class="flex items-center gap-2"><Checkbox :model-value="draft.optionalExposedCapabilities.includes(capability)" binary @update:model-value="draft.optionalExposedCapabilities = draft.optionalExposedCapabilities.includes(capability) ? draft.optionalExposedCapabilities.filter(value => value !== capability) : [...draft.optionalExposedCapabilities, capability]" /> {{ capability }}</label></div></fieldset>
            <Message v-if="save.isError.value" severity="error">Unable to save MQTT configuration.</Message>
            <Button type="submit" label="Save configuration" :disabled="!dirty || !valid || save.isPending.value" :loading="save.isPending.value" />
        </form>
    </section>
</template>
