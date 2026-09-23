<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Message from "primevue/message";
import {Capability, type ValetudoInformation} from "../../../frontend/src/api/types";
import {fetchWifiScan, sendWifiConfiguration} from "../../../frontend/src/api/client";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const ssid = ref("");
const password = ref("");
const submitted = ref(false);
const configurationSupported = computed(() => props.information.embedded && props.capabilities.includes(Capability.WifiConfiguration));
const scanSupported = computed(() => props.capabilities.includes(Capability.WifiScan));
const networks = useQuery({queryKey: ["wifiScan"], queryFn: fetchWifiScan, enabled: false, retry: false});
const configure = useMutation({
    mutationFn: sendWifiConfiguration,
    onSuccess: () => { submitted.value = true; }
});

function submit() {
    if (!configurationSupported.value || !ssid.value.trim() || !password.value || configure.isPending.value) return;
    configure.mutate({
        ssid: ssid.value.trim(),
        credentials: {type: "wpa2_psk", typeSpecificSettings: {password: password.value}}
    });
}
</script>

<template>
    <div class="mx-auto max-w-xl panel">
        <h1 class="mb-2 text-2xl font-bold">Connect the robot to Wi-Fi</h1>
        <Message v-if="!configurationSupported" severity="warn">Wi-Fi provisioning is not available on this device.</Message>
        <template v-else>
        <p class="muted mb-6">Choose a network or enter its name, then provide the password.</p>
        <Message v-if="submitted" severity="success" class="mb-5">
            Wi-Fi configuration sent. Reconnect your device to the robot's new network and reload Valetudo.
        </Message>
        <Message v-if="configure.isError.value" severity="error" class="mb-5">
            Could not save the Wi-Fi configuration. Check the connection and try again.
        </Message>
        <div v-if="scanSupported" class="mb-6">
            <Button label="Scan for networks" :loading="networks.isFetching.value" outlined @click="networks.refetch()" />
            <Message v-if="networks.isError.value" severity="warn" class="mt-3">Network scan failed. You can enter the name manually.</Message>
            <ul v-if="networks.data.value?.length" class="mt-3 space-y-2" aria-label="Available Wi-Fi networks">
                <li v-for="network in networks.data.value.filter(item => item.details.ssid)" :key="network.bssid">
                    <Button :label="network.details.ssid" text class="w-full justify-start" @click="ssid = network.details.ssid ?? ''" />
                </li>
            </ul>
        </div>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
            <label for="wifi-ssid">SSID / Wi-Fi name</label>
            <InputText id="wifi-ssid" v-model="ssid" autocomplete="off" required />
            <label for="wifi-password">Password</label>
            <Password id="wifi-password" v-model="password" :feedback="false" toggle-mask input-class="w-full" required />
            <Button type="submit" label="Connect" :loading="configure.isPending.value" :disabled="!ssid.trim() || !password || submitted" />
        </form>
        </template>
    </div>
</template>
