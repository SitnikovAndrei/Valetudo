<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {useQuery} from "@tanstack/vue-query";
import Drawer from "primevue/drawer";
import {Capability} from "../api/types";
import {fetchDuststreamingConfiguration} from "../api/client";
import {translate} from "../i18n";

type Link = {label: string; to: string; glyph: string};
const props = defineProps<{capabilities: Capability[]; variant: "mobile" | "desktop"}>();
const route = useRoute();
const open = ref(false);
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
watch(() => route.path, () => open.value = false);

const primary = computed<Link[]>(() => [
    {label: translate("Map and controls"), to: "/", glyph: "▦"},
    {label: translate("Timers"), to: "/valetudo/timers", glyph: "◷"},
    ...(props.capabilities.includes(Capability.TotalStatistics) ? [{label: translate("Statistics"), to: "/robot/total_statistics", glyph: "▥"}] : []),
    ...(props.capabilities.includes(Capability.ConsumableMonitoring) ? [{label: translate("Consumables"), to: "/robot/consumables", glyph: "◈"}] : [])
]);
const secondary = computed<Link[]>(() => [
    {label: translate("All settings"), to: "/options", glyph: "⚙"},
    {label: translate("Log"), to: "/valetudo/log", glyph: "≡"}
]);
const sections = computed(() => [
    {title: translate("Robot"), links: [
        ...(props.capabilities.includes(Capability.ManualControl) || props.capabilities.includes(Capability.HighResolutionManualControl) ? [{label: translate("Manual control"), to: "/robot/manual_control"}] : []),
        ...(props.capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled ? [{label: translate("Camera"), to: "/robot/camera"}] : [])
    ]},
    {title: translate("Settings"), links: [
        {label: translate("Cleaning"), to: "/options"},
        {label: translate("Map"), to: "/options/map_management"},
        {label: translate("Connectivity"), to: "/options/connectivity"},
        {label: translate("Robot"), to: "/options/robot"},
        {label: translate("Valetudo"), to: "/options/valetudo"}
    ]},
    {title: translate("Service"), links: [
        {label: translate("Updater"), to: "/valetudo/updater"},
        {label: translate("System information"), to: "/valetudo/system_information"},
        {label: translate("AI Assistant"), to: "/valetudo/ai"},
        {label: translate("Help"), to: "/valetudo/help"},
        {label: translate("About"), to: "/valetudo/about"}
    ]}
].filter(group => group.links.length));

function current(path: string) {
    return path === "/options" ? route.path.startsWith("/options") : route.path === path;
}
</script>

<template>
    <aside v-if="variant === 'desktop'" class="app-sidebar" :aria-label='$t("Main navigation")'>
        <RouterLink class="app-brand" to="/"><span class="app-brand-mark">v</span><span>valetudo</span></RouterLink>
        <nav>
            <div class="app-nav-group">
                <p class="app-nav-title">{{ $t("Main") }}</p>
                <RouterLink v-for="link in primary" :key="link.to" :to="link.to" class="app-nav-link" :aria-current="current(link.to) ? 'page' : undefined"><span class="app-nav-glyph">{{ link.glyph }}</span>{{ link.label }}</RouterLink>
            </div>
            <div class="app-nav-group">
                <p class="app-nav-title">{{ $t("Settings") }}</p>
                <RouterLink v-for="link in secondary" :key="link.to" :to="link.to" class="app-nav-link" :aria-current="current(link.to) ? 'page' : undefined"><span class="app-nav-glyph">{{ link.glyph }}</span>{{ link.label }}</RouterLink>
                <button class="app-nav-link w-full text-left" type="button" @click="open = true"><span class="app-nav-glyph">☷</span>{{ $t("All sections") }}</button>
            </div>
        </nav>
        <div class="mt-auto border-t px-3 pt-4 text-xs" style="border-color: var(--app-border); color: var(--app-muted)">{{ $t("Local control") }}</div>
    </aside>
    <nav v-else class="app-mobile-nav" :aria-label='$t("Mobile navigation")'>
        <RouterLink to="/" :aria-current="current('/') ? 'page' : undefined"><span class="app-nav-glyph">▦</span>{{ $t("Map") }}</RouterLink>
        <RouterLink to="/valetudo/timers" :aria-current="current('/valetudo/timers') ? 'page' : undefined"><span class="app-nav-glyph">◷</span>{{ $t("Timers") }}</RouterLink>
        <RouterLink to="/options" :aria-current="current('/options') ? 'page' : undefined"><span class="app-nav-glyph">⚙</span>{{ $t("Settings") }}</RouterLink>
        <button type="button" :aria-label='$t("All sections")' @click="open = true"><span class="app-nav-glyph">☷</span>{{ $t("More") }}</button>
    </nav>
    <Drawer v-model:visible="open" :header='$t("All sections")' position="left" class="w-[min(90vw,24rem)]">
        <nav :aria-label='$t("All sections")'>
            <div v-for="group in [{title: $t('Main'), links: [...primary, ...secondary]}, ...sections]" :key="group.title" class="mb-5">
                <p class="app-nav-title">{{ group.title }}</p>
                <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="app-nav-link" :aria-current="current(link.to) ? 'page' : undefined">{{ link.label }}</RouterLink>
            </div>
        </nav>
        <slot name="preferences" />
    </Drawer>
</template>
