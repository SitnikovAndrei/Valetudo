<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from "vue";
import {useQuery} from "@tanstack/vue-query";
import {useRouter} from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability} from "../../frontend/src/api/types";
import {fetchCapabilities, fetchDuststreamingConfiguration, fetchValetudoInformation, fetchWifiStatus} from "../../frontend/src/api/client";
import AppNavigation from "./components/AppNavigation.vue";
import EventsPanel from "./components/EventsPanel.vue";
import WelcomeDialog from "./components/WelcomeDialog.vue";
import Select from "primevue/select";

type PaletteMode = "light" | "dark";

const router = useRouter();
const media = window.matchMedia("(prefers-color-scheme: dark)");
const saved = localStorage.getItem("palette-mode");
const paletteMode = ref<PaletteMode>(saved === "light" || saved === "dark" ? saved : (media.matches ? "dark" : "light"));
const usingSystemTheme = ref(saved !== "light" && saved !== "dark");
const themeChoice = computed(() => usingSystemTheme.value ? "system" : paletteMode.value);
const bypassProvisioning = ref(false);

const capabilities = useQuery({queryKey: ["capabilities"], queryFn: fetchCapabilities, retry: 1});
const information = useQuery({queryKey: ["valetudoInformation"], queryFn: fetchValetudoInformation, retry: 1});
const duststream = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: computed(() => capabilities.data.value?.includes(Capability.Duststreaming) === true)});
const wifiEnabled = computed(() => information.data.value?.embedded === true && capabilities.data.value?.includes(Capability.WifiConfiguration) === true && !bypassProvisioning.value);
const wifi = useQuery({queryKey: ["wifiStatus"], queryFn: fetchWifiStatus, enabled: wifiEnabled, retry: 1});
const loading = computed(() => capabilities.isPending.value || information.isPending.value || (wifiEnabled.value && wifi.isPending.value));
const failed = computed(() => capabilities.isError.value || information.isError.value || (wifiEnabled.value && wifi.isError.value));

watch(() => wifi.data.value?.state, state => {
    if (state === "connected") {
        bypassProvisioning.value = true;
        if (router.currentRoute.value.path === "/setup") {
            void router.replace("/");
        }
    } else if (state === "not_connected") {
        void router.replace("/setup");
    }
}, {immediate: true});

watch([() => router.currentRoute.value.path, capabilities.data, duststream.data], ([path, available, camera]) => {
    if (!available) return;
    const requirements: Record<string, Capability[]> = {
        "/options/connectivity/wifi": [Capability.WifiConfiguration],
        "/options/map_management/segments": [Capability.MapSegmentEdit, Capability.MapSegmentRename, Capability.MapSegmentMaterialControl],
        "/options/map_management/virtual_restrictions": [Capability.CombinedVirtualRestrictions],
        "/options/map_management/annotations": [Capability.MapAnnotations]
    };
    if (requirements[path] && !requirements[path].some(capability => available.includes(capability))) void router.replace("/");
    if (["/robot/camera", "/options/map_management/spectator"].includes(path) && (!available.includes(Capability.Duststreaming) || camera?.enabled === false)) void router.replace("/");
}, {immediate: true});

watch(() => router.currentRoute.value.path, path => {
    const title = path === "/" ? "" : path.split("/").filter(Boolean).slice(-2).map(part => part.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase())).join(" - ");
    document.title = title ? `Valetudo - ${title}` : "Valetudo";
}, {immediate: true});

watch(paletteMode, value => {
    document.documentElement.classList.toggle("dark", value === "dark");
    if (!usingSystemTheme.value) {
        localStorage.setItem("palette-mode", value);
    }
}, {immediate: true});

const onSystemThemeChange = (event: MediaQueryListEvent) => {
    if (usingSystemTheme.value) {
        paletteMode.value = event.matches ? "dark" : "light";
    }
};
media.addEventListener("change", onSystemThemeChange);
onBeforeUnmount(() => media.removeEventListener("change", onSystemThemeChange));

function setTheme(value: "system" | PaletteMode) {
    usingSystemTheme.value = value === "system";
    if (value === "system") {localStorage.removeItem("palette-mode"); paletteMode.value = media.matches ? "dark" : "light";}
    else {paletteMode.value = value; localStorage.setItem("palette-mode", value);}
}

function retry() {
    if (capabilities.isError.value) void capabilities.refetch();
    if (information.isError.value) void information.refetch();
    if (wifi.isError.value) void wifi.refetch();
}
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pb-8 pt-4 md:px-8">
        <header class="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2"><AppNavigation variant="mobile" :capabilities="capabilities.data.value ?? []" /><RouterLink class="text-2xl font-bold no-underline" to="/">Valetudo</RouterLink></div>
            <div class="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <EventsPanel v-if="!loading && !failed" />
                <label class="sr-only" for="theme-choice">Theme</label><Select id="theme-choice" :model-value="themeChoice" :options="[{label: 'System', value: 'system'}, {label: 'Light', value: 'light'}, {label: 'Dark', value: 'dark'}]" option-label="label" option-value="value" aria-label="Theme" @update:model-value="setTheme" />
            </div>
        </header>
        <div class="flex flex-1 gap-6">
            <AppNavigation v-if="!loading && !failed" variant="desktop" :capabilities="capabilities.data.value ?? []" />
        <main class="min-w-0 flex-1">
            <div v-if="loading" class="panel" role="status">Loading robot capabilities and Valetudo information…</div>
            <div v-else-if="failed" class="panel flex flex-col items-start gap-4">
                <Message severity="error">Unable to connect to Valetudo.</Message>
                <Button label="Retry" @click="retry" />
            </div>
            <RouterView v-else :capabilities="capabilities.data.value ?? []" :information="information.data.value" :palette-mode="paletteMode" />
        </main>
        </div>
        <WelcomeDialog v-if="!loading && !failed && router.currentRoute.value.path !== '/setup' && information.data.value" :capabilities="capabilities.data.value ?? []" :information="information.data.value" />
    </div>
</template>
