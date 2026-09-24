<script setup lang="ts">
defineProps<{name: string; description?: string}>();
</script>

<template>
    <div class="setting-row">
        <div class="setting-row-copy"><strong>{{ name }}</strong><small v-if="description">{{ description }}</small></div>
        <div class="min-w-0"><slot /></div>
    </div>
</template>
