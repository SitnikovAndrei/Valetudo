<script setup lang="ts">
import {computed, inject} from "vue";
import Select from "primevue/select";
import {appPreferencesKey, type ThemeChoice} from "../appPreferences";
import {translate, type Language} from "../i18n";
import SettingRow from "./SettingRow.vue";

/** Language and theme pickers; shown in the top bar on wide screens and in Settings on phones. */
defineProps<{layout: "toolbar" | "rows"}>();
const preferences = inject(appPreferencesKey)!;
const languages = [{label: "Русский", value: "ru"}, {label: "English", value: "en"}];
const themes = computed(() => [
    {label: translate("System"), value: "system"},
    {label: translate("Light"), value: "light"},
    {label: translate("Dark"), value: "dark"}
]);
</script>

<template>
    <template v-if="layout === 'toolbar'">
        <Select class="preference-select" :model-value="preferences.language.value" :options="languages" option-label="label" option-value="value" :aria-label='$t("Language")' @update:model-value="preferences.setLanguage($event as Language)" />
        <Select class="preference-select" :model-value="preferences.themeChoice.value" :options="themes" option-label="label" option-value="value" :aria-label='$t("Theme")' @update:model-value="preferences.setTheme($event as ThemeChoice)" />
    </template>
    <template v-else>
        <SettingRow :name='$t("Language")'><Select class="setting-select" :model-value="preferences.language.value" :options="languages" option-label="label" option-value="value" :aria-label='$t("Language")' @update:model-value="preferences.setLanguage($event as Language)" /></SettingRow>
        <SettingRow :name='$t("Theme")'><Select class="setting-select" :model-value="preferences.themeChoice.value" :options="themes" option-label="label" option-value="value" :aria-label='$t("Theme")' @update:model-value="preferences.setTheme($event as ThemeChoice)" /></SettingRow>
    </template>
</template>
