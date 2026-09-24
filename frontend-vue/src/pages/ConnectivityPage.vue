<script setup lang="ts">
import {Capability} from "../api/types";
import PageHeader from "../components/PageHeader.vue";

defineProps<{capabilities: Capability[]}>();
</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Connectivity')" :subtitle="$t('Configure how Valetudo and your robot communicate with the outside world')" />
        <section class="panel">
            <nav class="grid gap-3 sm:grid-cols-2" :aria-label='$t("Connectivity settings")'>
                <RouterLink class="nav-card" to="/options/connectivity/mqtt"><span class="block">{{ $t("MQTT") }}</span><span class="muted block text-sm">{{ $t("Connect Valetudo to your MQTT Broker") }}</span></RouterLink>
                <RouterLink class="nav-card" to="/options/connectivity/auth"><span class="block">{{ $t("HTTP Basic Auth") }}</span><span class="muted block text-sm">{{ $t("Restrict access to Valetudo") }}</span></RouterLink>
                <RouterLink class="nav-card" to="/options/connectivity/networkadvertisement"><span class="block">{{ $t("Network advertisement") }}</span><span class="muted block text-sm">{{ $t("Control Bonjour/mDNS and SSDP/UPnP discoverability") }}</span></RouterLink>
                <RouterLink class="nav-card" to="/options/connectivity/ntp"><span class="block">{{ $t("NTP") }}</span><span class="muted block text-sm">{{ $t("Configure the integrated Network Time Protocol (NTP) client") }}</span></RouterLink>
                <RouterLink v-if="capabilities.includes(Capability.WifiConfiguration)" class="nav-card" to="/options/connectivity/wifi"><span class="block">{{ $t("Wi-Fi") }}</span><span class="muted block text-sm">{{ $t("Check connection details and modify the configuration") }}</span></RouterLink>
            </nav>
        </section>
    </div>
</template>
