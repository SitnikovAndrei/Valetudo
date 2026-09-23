<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";
import {useRobotMap} from "../composables/useRobotMap";
import MapCanvas from "../components/MapCanvas.vue";

defineProps<{paletteMode: "light" | "dark"}>();
const map = useRobotMap();
</script>

<template>
    <section class="panel">
        <h1 class="mb-4 text-2xl font-bold">Robot coverage map</h1>
        <p v-if="map.isPending.value" role="status">Loading map…</p>
        <Message v-else-if="map.isError.value" severity="error">Unable to load map. <Button label="Retry" text @click="map.refetch()" /></Message>
        <div v-else-if="map.data.value" class="h-[min(70vh,700px)] overflow-hidden rounded-xl" style="background: var(--app-bg)"><MapCanvas :map="map.data.value" :palette-mode="paletteMode" mode="pan" :selected-segment-ids="[]" :zones="[]" coverage /></div>
    </section>
</template>
