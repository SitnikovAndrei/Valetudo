<script setup lang="ts">
defineProps<{action: "start" | "pause" | "stop" | "home"}>();
</script>

<template>
    <svg class="home-command-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path v-if="action === 'start'" d="M6 3.5v17l14-8.5z" fill="currentColor" />
        <template v-else-if="action === 'pause'">
            <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
            <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
        </template>
        <rect v-else-if="action === 'stop'" x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" />
        <path v-else d="m3 11 9-8 9 8M5.5 9v11h13V9M9.5 20v-6h5v6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    </svg>
</template>
