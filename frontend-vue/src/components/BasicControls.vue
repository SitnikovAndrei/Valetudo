<script setup lang="ts">
import Button from "primevue/button";
import type {BasicControlCommand} from "../api/client";
import type {BasicControl} from "../composables/useBasicControl";
import HomeCommandIcon from "./HomeCommandIcon.vue";

/**
 * Start / pause / stop / dock. "stack" is the desktop panel layout; "bar" is the compact
 * phone layout where secondary commands are icon buttons next to the primary action.
 */
defineProps<{control: BasicControl; layout: "stack" | "bar"; showStart: boolean}>();
const secondary: BasicControlCommand[] = ["pause", "stop", "home"];
</script>

<template>
    <div class="basic-controls" :class="`basic-controls--${layout}`">
        <Button v-if="showStart" class="basic-controls-start" :label="$t(control.label('start'))" :disabled="!control.enabled('start')" :loading="control.running('start')" @click="control.send('start')">
            <template #icon><HomeCommandIcon action="start" /></template>
        </Button>
        <div class="basic-controls-secondary">
            <Button v-for="action in secondary" :key="action" outlined :severity="action === 'stop' ? 'danger' : undefined"
                :label="layout === 'stack' ? $t(control.label(action)) : undefined" :aria-label="$t(control.label(action))" :title="$t(control.label(action))"
                :disabled="!control.enabled(action)" :loading="control.running(action)" @click="control.send(action)">
                <template #icon><HomeCommandIcon :action="action" /></template>
            </Button>
        </div>
    </div>
</template>

<style scoped>
.basic-controls--stack { display: grid; gap: 8px; }
.basic-controls--stack .basic-controls-secondary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.basic-controls--stack :deep(.p-button) { width: 100%; min-height: 44px; justify-content: center; }
.basic-controls--stack .basic-controls-secondary :deep(.p-button) { padding-inline: 6px; }
.basic-controls--bar { display: contents; }
.basic-controls--bar .basic-controls-start { flex: 1; min-width: 0; min-height: 44px; }
.basic-controls--bar .basic-controls-secondary { display: flex; gap: 6px; }
.basic-controls--bar .basic-controls-secondary :deep(.p-button) { width: 44px; height: 44px; padding: 0; }
</style>
