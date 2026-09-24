<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from "vue";
import {useQuery} from "@tanstack/vue-query";
import {useRouter} from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability} from "./api/types";
import {fetchCapabilities, fetchDuststreamingConfiguration, fetchValetudoInformation, fetchWifiStatus} from "./api/client";
import AppNavigation from "./components/AppNavigation.vue";
import EventsPanel from "./components/EventsPanel.vue";
import WelcomeDialog from "./components/WelcomeDialog.vue";
import Select from "primevue/select";
import {usePrimeVue} from "@primevue/core/config";
import {i18n, setLanguage, translate, type Language} from "./i18n";
import {primeLocale} from "./i18n/prime";

type PaletteMode = "light" | "dark";

const router = useRouter();
const prime = usePrimeVue();
const language = i18n.global.locale;
const media = window.matchMedia("(prefers-color-scheme: dark)");
const saved = localStorage.getItem("palette-mode");
const paletteMode = ref<PaletteMode>(saved === "light" || saved === "dark" ? saved : (media.matches ? "dark" : "light"));
const usingSystemTheme = ref(saved !== "light" && saved !== "dark");
const themeChoice = computed(() => usingSystemTheme.value ? "system" : paletteMode.value);
const pageTitle = computed(() => {
    const path = router.currentRoute.value.path;
    if (path === "/") return translate("Map and controls");
    if (path === "/options") return translate("Settings");
    if (path.startsWith("/options/map_management")) return translate("Map");
    if (path.startsWith("/options/connectivity")) return translate("Connectivity");
    if (path.startsWith("/options/robot")) return translate("Robot");
    if (path.startsWith("/options/valetudo")) return translate("Valetudo");
    if (path.startsWith("/robot")) return translate("Robot");
    if (path.startsWith("/valetudo/timers")) return translate("Timers");
    if (path === "/valetudo/log") return translate("Log");
    if (path === "/valetudo/updater") return translate("Updater");
    if (path === "/valetudo/system_information") return translate("System information");
    if (path === "/valetudo/ai") return translate("AI Assistant");
    if (path === "/valetudo/help") return translate("Help");
    if (path === "/valetudo/about") return translate("About");
    return translate("Valetudo");
});
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

watch([() => router.currentRoute.value.path, language], ([path, value]) => {
    document.documentElement.lang = value;
    Object.assign(prime.config.locale!, primeLocale(value));
    const titles: Record<string, string> = {
        "/options": translate("Settings"),
        "/robot/consumables": translate("Consumables"), "/robot/manual_control": translate("Manual control"), "/robot/total_statistics": translate("Total statistics"), "/robot/camera": translate("Camera"),
        "/options/connectivity": translate("Connectivity"), "/options/connectivity/auth": translate("HTTP Basic Auth"), "/options/connectivity/networkadvertisement": translate("Network advertisement"),
        "/options/connectivity/ntp": translate("NTP"), "/options/connectivity/wifi": translate("Wi-Fi connectivity"), "/options/connectivity/mqtt": translate("MQTT connectivity"),
        "/options/map_management": translate("Map options"), "/options/map_management/segments": translate("Segment management"), "/options/map_management/virtual_restrictions": translate("Virtual restrictions"),
        "/options/map_management/annotations": translate("Map annotations"), "/options/map_management/spectator": translate("Spectator map"), "/options/map_management/robot_coverage": translate("Robot coverage map"),
        "/options/robot": translate("Robot options"), "/options/robot/system": translate("Robot system options"), "/options/robot/quirks": translate("Quirks"),
        "/options/valetudo": translate("Valetudo options"), "/valetudo/timers": translate("Timers"),
        "/valetudo/log": translate("Log"), "/valetudo/system_information": translate("System information"), "/valetudo/updater": translate("Updater"),
        "/valetudo/ai": translate("AI Assistant"), "/valetudo/help": translate("Help"), "/valetudo/about": translate("About"), "/setup": translate("Wi-Fi connectivity")
    };
    document.title = path === "/" ? "Valetudo" : `Valetudo - ${titles[path] ?? "Valetudo"}`;
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
    <div class="app-frame" :class="{'app-frame-no-sidebar': loading || failed || router.currentRoute.value.path === '/setup'}">
        <AppNavigation v-if="!loading && !failed && router.currentRoute.value.path !== '/setup'" variant="desktop" :capabilities="capabilities.data.value ?? []" />
        <div class="app-main">
            <header class="app-topbar">
                <div class="app-breadcrumb"><span class="breadcrumb-prefix">Valetudo <span>/</span></span>{{ pageTitle }}</div>
                <div class="app-topbar-tools">
                    <EventsPanel v-if="!loading && !failed" />
                    <label class="sr-only" for="language-choice">{{ $t("Language") }}</label><Select id="language-choice" :model-value="language" :options="[{label: 'Русский', value: 'ru'}, {label: 'English', value: 'en'}]" option-label="label" option-value="value" :aria-label='$t("Language")' @update:model-value="setLanguage($event as Language)" />
                    <label class="sr-only" for="theme-choice">{{ $t("Theme") }}</label><Select id="theme-choice" :model-value="themeChoice" :options="[{label: $t('System'), value: 'system'}, {label: $t('Light'), value: 'light'}, {label: $t('Dark'), value: 'dark'}]" option-label="label" option-value="value" :aria-label='$t("Theme")' @update:model-value="setTheme" />
                </div>
            </header>
        <main class="app-content">
            <div v-if="loading" class="panel" role="status">{{ $t("Loading robot capabilities and Valetudo information…") }}</div>
            <div v-else-if="failed" class="panel flex flex-col items-start gap-4">
                <Message severity="error">{{ $t("Unable to connect to Valetudo.") }}</Message>
                <Button :label='$t("Retry")' @click="retry" />
            </div>
            <RouterView v-else :capabilities="capabilities.data.value ?? []" :information="information.data.value" :palette-mode="paletteMode" />
        </main>
        </div>
        <AppNavigation v-if="!loading && !failed && router.currentRoute.value.path !== '/setup'" variant="mobile" :capabilities="capabilities.data.value ?? []">
            <template #preferences>
                <div class="border-t pt-4" style="border-color: var(--app-border)">
                    <p class="app-nav-title">{{ $t("Preferences") }}</p>
                    <label class="mb-3 flex items-center justify-between gap-2">{{ $t("Language") }}<Select :model-value="language" :options="[{label: 'Русский', value: 'ru'}, {label: 'English', value: 'en'}]" option-label="label" option-value="value" @update:model-value="setLanguage($event as Language)" /></label>
                    <label class="flex items-center justify-between gap-2">{{ $t("Theme") }}<Select :model-value="themeChoice" :options="[{label: $t('System'), value: 'system'}, {label: $t('Light'), value: 'light'}, {label: $t('Dark'), value: 'dark'}]" option-label="label" option-value="value" @update:model-value="setTheme" /></label>
                </div>
            </template>
        </AppNavigation>
        <WelcomeDialog v-if="!loading && !failed && router.currentRoute.value.path !== '/setup' && information.data.value" :capabilities="capabilities.data.value ?? []" :information="information.data.value" />
    </div>
</template>
