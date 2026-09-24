<script setup lang="ts">
import Button from "primevue/button";

defineProps<{loading?: boolean; error?: boolean; empty?: boolean; loadingText?: string; errorText?: string; emptyText?: string}>();
defineEmits<{retry: []}>();
</script>

<template>
    <div v-if="loading" class="async-state" role="status">{{ loadingText || $t("Loading…") }}</div>
    <div v-else-if="error" class="async-state" role="alert"><span>{{ errorText || $t("Request failed.") }}</span><Button :label='$t("Retry")' outlined @click="$emit('retry')" /></div>
    <div v-else-if="empty" class="async-state">{{ emptyText || $t("No data reported.") }}</div>
    <slot v-else />
</template>
