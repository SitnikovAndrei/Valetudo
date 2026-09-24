<script setup lang="ts">
defineProps<{title: string; subtitle?: string; kicker?: string}>();
</script>

<template>
    <header class="page-header">
        <p v-if="kicker" class="page-header-kicker">{{ kicker }}</p>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
    </header>
</template>
