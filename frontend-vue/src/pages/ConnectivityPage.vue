<script setup lang="ts">
import {Capability} from "../../../frontend/src/api/types";

defineProps<{capabilities: Capability[]}>();
</script>

<template>
    <section class="panel">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Connectivity") }}</h1>
        <nav class="grid gap-3 sm:grid-cols-2" :aria-label='$t("Connectivity settings")'>
            <RouterLink class="nav-card" to="/options/connectivity/mqtt">{{ $t("MQTT") }}</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/auth">{{ $t("HTTP Basic Auth") }}</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/networkadvertisement">{{ $t("Network advertisement") }}</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/ntp">{{ $t("NTP") }}</RouterLink>
            <RouterLink v-if="capabilities.includes(Capability.WifiConfiguration)" class="nav-card" to="/options/connectivity/wifi">{{ $t("Wi-Fi") }}</RouterLink>
        </nav>
    </section>
</template>
