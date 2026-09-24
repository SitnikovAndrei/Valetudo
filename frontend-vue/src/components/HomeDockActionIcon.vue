<script setup lang="ts">
defineProps<{action: "empty" | "wash" | "dry" | "stop"}>();
</script>

<template>
    <svg class="home-dock-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true" focusable="false">
        <template v-if="action === 'empty'">
            <path d="M4 7h16M9 4h6M6 7l1 13h10l1-13M10 11v5M14 11v5" />
        </template>
        <template v-else-if="action === 'wash'">
            <path d="M12 3C9 7 6 10 6 14a6 6 0 0 0 12 0c0-4-3-7-6-11Z" />
            <path d="M9 15a3 3 0 0 0 3 3" />
        </template>
        <template v-else-if="action === 'dry'">
            <path d="M3 8h12a2.5 2.5 0 1 0-2.5-2.5M3 12h17a2 2 0 1 1-2 2M3 16h9a2.5 2.5 0 1 1-2.5 2.5" />
        </template>
        <rect v-else x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
</template>
