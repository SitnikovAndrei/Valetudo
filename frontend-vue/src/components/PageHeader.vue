<script setup lang="ts">
/** Page title block used by every page, so titles share one position, size and spacing. */
defineProps<{title: string; subtitle?: string; kicker?: string}>();
</script>

<template>
    <header class="page-header">
        <div class="page-header-copy">
            <p v-if="kicker" class="kicker">{{ kicker }}</p>
            <h1>{{ title }}</h1>
            <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="page-header-actions"><slot name="actions" /></div>
    </header>
</template>
