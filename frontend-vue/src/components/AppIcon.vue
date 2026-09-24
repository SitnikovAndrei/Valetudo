<script setup lang="ts">
import type {IconName} from "./icons";

/**
 * Stroke icons (24×24 grid, currentColor). Replaces Unicode glyphs, which render differently
 * — or not at all — depending on the platform's fonts.
 */

defineProps<{name: IconName}>();
</script>

<template>
    <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <template v-if="name === 'map'"><path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" /><path d="M9 4v14M15 6v14" /></template>
        <template v-else-if="name === 'timer'"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></template>
        <template v-else-if="name === 'statistics'"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></template>
        <template v-else-if="name === 'consumables'"><path d="M4 8h16l-1.5 12h-13L4 8Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></template>
        <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></template>
        <template v-else-if="name === 'log'"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></template>
        <template v-else-if="name === 'whole-home'"><path d="m3 11 9-7 9 7" /><path d="M5 9.5V20h14V9.5" /></template>
        <template v-else-if="name === 'rooms'"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v10M3 13h18M8 13v8" /></template>
        <template v-else-if="name === 'zone'"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="9" y="9" width="6" height="6" rx="1" /></template>
        <template v-else-if="name === 'point'"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></template>
        <template v-else-if="name === 'moon'"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></template>
        <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14" />
        <path v-else-if="name === 'minus'" d="M5 12h14" />
        <template v-else-if="name === 'fit'"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /><rect x="8.5" y="8.5" width="7" height="7" rx="1" /></template>
        <path v-else-if="name === 'fullscreen'" d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
        <path v-else-if="name === 'close'" d="M6 6l12 12M18 6 6 18" />
        <path v-else-if="name === 'bell'" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        <path v-else-if="name === 'chevron-left'" d="m15 18-6-6 6-6" />
        <path v-else-if="name === 'chevron-right'" d="m9 18 6-6-6-6" />
    </svg>
</template>
