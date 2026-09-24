<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";
import {Capability} from "../api/types";
import {translate} from "../i18n";

type Link = {label: string; to: string; glyph: string};
const props = defineProps<{capabilities: Capability[]; variant: "mobile" | "desktop"}>();
const route = useRoute();
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
            </div>
        </nav>
        <div class="mt-auto border-t px-3 pt-4 text-xs" style="border-color: var(--app-border); color: var(--app-muted)">{{ $t("Local control") }}</div>
    </aside>
    <nav v-else class="app-mobile-nav" :aria-label='$t("Mobile navigation")'>
        <RouterLink to="/" :aria-current="current('/') ? 'page' : undefined"><span class="app-nav-glyph">▦</span>{{ $t("Map") }}</RouterLink>
        <RouterLink to="/valetudo/timers" :aria-current="current('/valetudo/timers') ? 'page' : undefined"><span class="app-nav-glyph">◷</span>{{ $t("Timers") }}</RouterLink>
        <RouterLink to="/options" :aria-current="current('/options') ? 'page' : undefined"><span class="app-nav-glyph">⚙</span>{{ $t("Settings") }}</RouterLink>
    </nav>
</template>
