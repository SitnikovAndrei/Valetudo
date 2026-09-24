<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";
import {Capability} from "../api/types";
import {translate} from "../i18n";
import AppIcon from "./AppIcon.vue";
import type {IconName} from "./icons";

type Link = {label: string; to: string; icon: IconName};
const props = defineProps<{capabilities: Capability[]; variant: "mobile" | "desktop"}>();
const route = useRoute();
const primary = computed<Link[]>(() => [
    {label: translate("Map and controls"), to: "/", icon: "map"},
    {label: translate("Timers"), to: "/valetudo/timers", icon: "timer"},
    ...(props.capabilities.includes(Capability.TotalStatistics) ? [{label: translate("Statistics"), to: "/robot/total_statistics", icon: "statistics" as const}] : []),
    ...(props.capabilities.includes(Capability.ConsumableMonitoring) ? [{label: translate("Consumables"), to: "/robot/consumables", icon: "consumables" as const}] : [])
]);
const secondary = computed<Link[]>(() => [
    {label: translate("All settings"), to: "/options", icon: "settings"},
    {label: translate("Log"), to: "/valetudo/log", icon: "log"}
]);
const mobile = computed<Link[]>(() => [
    {label: translate("Map"), to: "/", icon: "map"},
    {label: translate("Timers"), to: "/valetudo/timers", icon: "timer"},
    {label: translate("Settings"), to: "/options", icon: "settings"}
]);
function current(path: string) {
    return path === "/options" ? route.path.startsWith("/options") : route.path === path;
}
</script>

<template>
    <aside v-if="variant === 'desktop'" class="app-sidebar" :aria-label='$t("Main navigation")'>
        <RouterLink class="app-brand" to="/"><span class="app-brand-mark">v</span><span>valetudo</span></RouterLink>
        <nav>
            <div v-for="group in [{title: 'Main', links: primary}, {title: 'Settings', links: secondary}]" :key="group.title" class="app-nav-group">
                <p class="app-nav-title">{{ $t(group.title) }}</p>
                <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="app-nav-link" :aria-current="current(link.to) ? 'page' : undefined"><AppIcon :name="link.icon" />{{ link.label }}</RouterLink>
            </div>
        </nav>
        <div class="app-sidebar-footer">{{ $t("Local control") }}</div>
    </aside>
    <nav v-else class="app-mobile-nav" :aria-label='$t("Mobile navigation")'>
        <RouterLink v-for="link in mobile" :key="link.to" :to="link.to" :aria-current="current(link.to) ? 'page' : undefined"><AppIcon :name="link.icon" />{{ link.label }}</RouterLink>
    </nav>
</template>
