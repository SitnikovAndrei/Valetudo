<script setup lang="ts">
import {ref} from "vue";
import {useMutation, useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import {Capability} from "../../../frontend/src/api/types";
import {fetchWifiConfigurationProperties, fetchWifiStatus, sendWifiConfiguration} from "../../../frontend/src/api/client";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]}>();
const status = useQuery({queryKey: ["wifiStatus"], queryFn: fetchWifiStatus, enabled: props.capabilities.includes(Capability.WifiConfiguration)});
const properties = useQuery({queryKey: ["wifiProperties"], queryFn: fetchWifiConfigurationProperties, enabled: props.capabilities.includes(Capability.WifiConfiguration)});
const ssid = ref("");
const password = ref("");
const confirm = ref(false);
const applying = ref(false);
const save = useMutation({mutationFn: sendWifiConfiguration, onSuccess: () => {confirm.value = false; applying.value = true;}});

function submit() {
    if (!ssid.value.trim() || !password.value || save.isPending.value) return;
    save.mutate({ssid: ssid.value.trim(), credentials: {type: "wpa2_psk", typeSpecificSettings: {password: password.value}}});
}
function reload() {window.location.reload();}
</script>

<template>
    <section class="panel max-w-2xl">
        <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">{{ $t("Wi-Fi connectivity") }}</h1><Button :label='$t("Refresh")' text :loading="status.isFetching.value" @click="status.refetch()" /></div>
        <Message v-if="!capabilities.includes(Capability.WifiConfiguration)" severity="warn">{{ $t("Wi-Fi configuration is unavailable on this robot.") }}</Message>
        <p v-else-if="status.isPending.value || properties.isPending.value" role="status">{{ $t("Loading Wi-Fi status…") }}</p>
        <Message v-else-if="status.isError.value || properties.isError.value" severity="error">{{ $t("Unable to load Wi-Fi status.") }}</Message>
        <template v-else>
            <h2 class="mb-2 text-xl font-semibold">{{ status.data.value?.state === 'connected' ? status.data.value.details.ssid || $t("Connected") : valueLabel(status.data.value?.state) }}</h2>
            <p v-if="status.data.value?.details.signal !== undefined" class="muted">{{ $t("Signal:") }} {{ status.data.value.details.signal }} dBm</p>
            <p v-for="ip in status.data.value?.details.ips" :key="ip" class="muted">{{ ip }}</p>
            <form v-if="properties.data.value?.provisionedReconfigurationSupported" class="mt-6 flex flex-col gap-3" @submit.prevent="confirm = true"><h3 class="font-semibold">{{ $t("Change Wi-Fi configuration") }}</h3><label class="flex flex-col gap-1">{{ $t("SSID / Wi-Fi name") }} <InputText v-model="ssid" required /></label><label class="flex flex-col gap-1">{{ $t("Password") }} <Password v-model="password" :feedback="false" toggle-mask required /></label><Button type="submit" :label='$t("Save configuration")' :disabled="!ssid.trim() || !password" /></form>
            <Message v-else severity="info" class="mt-5">{{ $t("To connect to another network, reset the robot's Wi-Fi connection, then configure it through Valetudo. Check the instructions for your robot model.") }}</Message>
            <Message v-if="save.isError.value" severity="error" class="mt-4">{{ $t("Unable to save Wi-Fi configuration.") }}</Message>
        </template>
        <Dialog v-model:visible="confirm" modal :header='$t("Apply new Wi-Fi configuration?")' class="max-w-md"><p>{{ $t("The robot will connect to the new network. Its URL may change. You can restore the integrated hotspot using your robot's instructions.") }}</p><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="confirm = false" /><Button :label='$t("Apply")' :loading="save.isPending.value" @click="submit" /></div></Dialog>
        <Dialog :visible="applying" modal :header='$t("New Wi-Fi configuration is applying")' :closable="false" class="max-w-md"><p>{{ $t("After reloading, you may need to use a new robot URL.") }}</p><div class="mt-5 flex justify-end"><Button :label='$t("OK")' @click="reload" /></div></Dialog>
    </section>
</template>
