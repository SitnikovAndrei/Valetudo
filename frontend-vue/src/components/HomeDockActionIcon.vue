<script setup lang="ts">
/** Dock icons draw a mop head so they do not read as the water and operation mode presets next to them. */
defineProps<{action: "empty" | "wash" | "dry" | "stop"}>();
</script>

<template>
    <svg class="home-dock-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true" focusable="false">
        <template v-if="action === 'empty'">
            <path d="M4 7h16M9 4h6M6 7l1 13h10l1-13M10 11v5M14 11v5" />
        </template>
        <!-- A small mop head on top; the large mark below (drop or heat waves) is what tells wash and dry apart. -->
        <template v-else-if="action === 'wash'">
            <path d="M12 1.5v3M7.5 4.5h9" />
            <path d="M12 9c-3 3.6-4.6 6.2-4.6 8.4a4.6 4.6 0 0 0 9.2 0c0-2.2-1.6-4.8-4.6-8.4Z" />
        </template>
        <template v-else-if="action === 'dry'">
            <path d="M12 1.5v3M7.5 4.5h9" />
            <path d="M7 9c1.6 1.6-1.6 3.4 0 5s-1.6 3.4 0 5M12 9c1.6 1.6-1.6 3.4 0 5s-1.6 3.4 0 5M17 9c1.6 1.6-1.6 3.4 0 5s-1.6 3.4 0 5" />
        </template>
        <rect v-else x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
</template>
