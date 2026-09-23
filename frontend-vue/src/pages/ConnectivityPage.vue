<script setup lang="ts">
import {Capability} from "../../../frontend/src/api/types";

defineProps<{capabilities: Capability[]}>();
</script>

<template>
    <section class="panel">
        <h1 class="mb-5 text-2xl font-bold">Connectivity</h1>
        <nav class="grid gap-3 sm:grid-cols-2" aria-label="Connectivity settings">
            <RouterLink class="nav-card" to="/options/connectivity/mqtt">MQTT</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/auth">HTTP Basic Auth</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/networkadvertisement">Network advertisement</RouterLink>
            <RouterLink class="nav-card" to="/options/connectivity/ntp">NTP</RouterLink>
            <RouterLink v-if="capabilities.includes(Capability.WifiConfiguration)" class="nav-card" to="/options/connectivity/wifi">Wi-Fi</RouterLink>
        </nav>
    </section>
</template>
