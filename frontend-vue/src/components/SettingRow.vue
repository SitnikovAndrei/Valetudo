<script setup lang="ts">
/** `stacked` puts the control under the text, for wide controls such as segmented buttons. */
defineProps<{name: string; description?: string; stacked?: boolean}>();
</script>

<template>
    <div class="setting-row" :class="{'setting-row--stacked': stacked}">
        <div class="setting-row-copy"><strong>{{ name }}</strong><small v-if="description">{{ description }}</small></div>
        <div class="min-w-0"><slot /></div>
    </div>
</template>
