<script setup lang="ts">
defineProps<{title: string; description?: string}>();
</script>

<template>
    <section class="settings-section">
        <h2>{{ title }}</h2>
        <p v-if="description" class="muted mb-3 text-sm">{{ description }}</p>
        <slot />
    </section>
</template>
