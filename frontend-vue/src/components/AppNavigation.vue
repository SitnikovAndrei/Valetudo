<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import {Capability} from "../../../frontend/src/api/types";
import {fetchDuststreamingConfiguration} from "../../../frontend/src/api/client";
import {translate} from "../i18n";

const props = defineProps<{capabilities: Capability[]; variant: "mobile" | "desktop"}>();
const route = useRoute();
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
const open = ref(false);
watch(() => route.path, () => open.value = false);
const groups = computed(() => [
    {title: translate("Main"), links: [{label: translate("Home"), to: "/"}]},
    {title: translate("Robot"), links: [
        ...(props.capabilities.includes(Capability.ConsumableMonitoring) ? [{label: translate("Consumables"), to: "/robot/consumables"}] : []),
        ...(props.capabilities.includes(Capability.ManualControl) || props.capabilities.includes(Capability.HighResolutionManualControl) ? [{label: translate("Manual control"), to: "/robot/manual_control"}] : []),
        ...(props.capabilities.includes(Capability.TotalStatistics) ? [{label: translate("Statistics"), to: "/robot/total_statistics"}] : []),
        ...(props.capabilities.includes(Capability.Duststreaming) && duststream.data.value?.enabled ? [{label: translate("Camera"), to: "/robot/camera"}] : [])
    ]},
    {title: translate("Options"), links: [
        ...(props.capabilities.some(capability => [Capability.PersistentMapControl, Capability.MappingPass, Capability.MapReset, Capability.MapSegmentEdit, Capability.MapSegmentRename, Capability.MapSegmentMaterialControl, Capability.CombinedVirtualRestrictions, Capability.MapAnnotations].includes(capability)) ? [{label: translate("Map"), to: "/options/map_management"}] : []),
        {label: translate("Robot"), to: "/options/robot"},
        {label: translate("Connectivity"), to: "/options/connectivity"},
    ]},
    {title: "Valetudo", links: [
        {label: translate("Options"), to: "/options/valetudo"},
        {label: translate("Timers"), to: "/valetudo/timers"},
        {label: translate("Log"), to: "/valetudo/log"},
        {label: translate("System information"), to: "/valetudo/system_information"}
    ]}
].filter(group => group.links.length));
</script>

<template>
    <Button v-if="variant === 'mobile'" class="md:hidden" :label='$t("Menu")' text :aria-label='$t("Open navigation")' @click="open = true" />
    <nav v-if="variant === 'desktop'" class="hidden w-48 shrink-0 md:block" :aria-label='$t("Main navigation")'>
        <div v-for="group in groups" :key="group.title" class="mb-5">
            <p class="muted mb-2 px-3 text-xs font-semibold uppercase tracking-wider">{{ group.title }}</p>
            <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link block rounded-lg px-3 py-2 no-underline" :aria-current="route.path === link.to ? 'page' : undefined">{{ link.label }}</RouterLink>
        </div>
    </nav>
    <Drawer v-if="variant === 'mobile'" v-model:visible="open" :header='$t("Valetudo")' position="left">
        <nav :aria-label='$t("Mobile navigation")'>
            <div v-for="group in groups" :key="group.title" class="mb-5">
                <p class="muted mb-2 text-xs font-semibold uppercase tracking-wider">{{ group.title }}</p>
                <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link block rounded-lg px-3 py-3 no-underline" :aria-current="route.path === link.to ? 'page' : undefined">{{ link.label }}</RouterLink>
            </div>
        </nav>
    </Drawer>
</template>
