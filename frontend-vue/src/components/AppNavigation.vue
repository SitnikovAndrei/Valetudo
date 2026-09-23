<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import {Capability} from "../../../frontend/src/api/types";
import {fetchDuststreamingConfiguration} from "../../../frontend/src/api/client";

const props = defineProps<{capabilities: Capability[]; variant: "mobile" | "desktop"}>();
const route = useRoute();
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
const open = ref(false);
watch(() => route.path, () => open.value = false);
const groups = computed(() => [
    {title: "Main", links: [{label: "Home", to: "/"}]},
    {title: "Robot", links: [
        ...(props.capabilities.includes(Capability.ConsumableMonitoring) ? [{label: "Consumables", to: "/robot/consumables"}] : []),
        ...(props.capabilities.includes(Capability.ManualControl) || props.capabilities.includes(Capability.HighResolutionManualControl) ? [{label: "Manual control", to: "/robot/manual_control"}] : []),
        ...(props.capabilities.includes(Capability.TotalStatistics) ? [{label: "Statistics", to: "/robot/total_statistics"}] : []),
        ...(props.capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled ? [{label: "Camera", to: "/robot/camera"}] : [])
    ]},
    {title: "Options", links: [
        ...(props.capabilities.some(capability => [Capability.PersistentMapControl, Capability.MappingPass, Capability.MapReset, Capability.MapSegmentEdit, Capability.MapSegmentRename, Capability.MapSegmentMaterialControl, Capability.CombinedVirtualRestrictions, Capability.MapAnnotations].includes(capability)) ? [{label: "Map", to: "/options/map_management"}] : []),
        {label: "Robot", to: "/options/robot"},
        {label: "Connectivity", to: "/options/connectivity"},
    ]},
    {title: "Valetudo", links: [
        {label: "Options", to: "/options/valetudo"},
        {label: "Timers", to: "/valetudo/timers"},
        {label: "Log", to: "/valetudo/log"},
        {label: "Updater", to: "/valetudo/updater"},
        {label: "AI Assistant", to: "/valetudo/ai"},
        {label: "System information", to: "/valetudo/system_information"},
        {label: "Help", to: "/valetudo/help"},
        {label: "About", to: "/valetudo/about"}
    ]}
].filter(group => group.links.length));
</script>

<template>
    <Button v-if="variant === 'mobile'" class="md:hidden" label="Menu" text aria-label="Open navigation" @click="open = true" />
    <nav v-if="variant === 'desktop'" class="hidden w-48 shrink-0 md:block" aria-label="Main navigation">
        <div v-for="group in groups" :key="group.title" class="mb-5">
            <p class="muted mb-2 px-3 text-xs font-semibold uppercase tracking-wider">{{ group.title }}</p>
            <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link block rounded-lg px-3 py-2 no-underline" :aria-current="route.path === link.to ? 'page' : undefined">{{ link.label }}</RouterLink>
        </div>
        <div class="border-t pt-4" style="border-color: var(--app-border)"><p class="muted mb-2 px-3 text-xs font-semibold uppercase tracking-wider">Links</p><a class="nav-link block rounded-lg px-3 py-2 no-underline" href="./swagger/" target="_blank" rel="noopener noreferrer">Swagger UI</a><a class="nav-link block rounded-lg px-3 py-2 no-underline" href="https://valetudo.cloud" target="_blank" rel="noopener noreferrer">Docs</a><a class="nav-link block rounded-lg px-3 py-2 no-underline" href="https://github.com/Hypfer/Valetudo" target="_blank" rel="noopener noreferrer">GitHub</a><a class="nav-link block rounded-lg px-3 py-2 no-underline" href="https://github.com/sponsors/Hypfer" target="_blank" rel="noopener noreferrer">Donate</a></div>
    </nav>
    <Drawer v-if="variant === 'mobile'" v-model:visible="open" header="Valetudo" position="left">
        <nav aria-label="Mobile navigation">
            <div v-for="group in groups" :key="group.title" class="mb-5">
                <p class="muted mb-2 text-xs font-semibold uppercase tracking-wider">{{ group.title }}</p>
                <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link block rounded-lg px-3 py-3 no-underline" :aria-current="route.path === link.to ? 'page' : undefined">{{ link.label }}</RouterLink>
            </div>
            <div class="border-t pt-4" style="border-color: var(--app-border)"><p class="muted mb-2 text-xs font-semibold uppercase tracking-wider">Links</p><a class="nav-link block rounded-lg px-3 py-3 no-underline" href="./swagger/" target="_blank" rel="noopener noreferrer">Swagger UI</a><a class="nav-link block rounded-lg px-3 py-3 no-underline" href="https://valetudo.cloud" target="_blank" rel="noopener noreferrer">Docs</a><a class="nav-link block rounded-lg px-3 py-3 no-underline" href="https://github.com/Hypfer/Valetudo" target="_blank" rel="noopener noreferrer">GitHub</a><a class="nav-link block rounded-lg px-3 py-3 no-underline" href="https://github.com/sponsors/Hypfer" target="_blank" rel="noopener noreferrer">Donate</a></div>
        </nav>
    </Drawer>
</template>
