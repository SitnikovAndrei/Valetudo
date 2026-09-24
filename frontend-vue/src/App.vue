<script setup lang="ts">
import {computed, provide, ref, watch} from "vue";
import {useQuery} from "@tanstack/vue-query";
import {useRoute, useRouter} from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import {usePrimeVue} from "@primevue/core/config";
import {Capability} from "./api/types";
import {capabilitiesQuery, valetudoInformationQuery, wifiStatusQuery} from "./api/queries";
import AppNavigation from "./components/AppNavigation.vue";
import EventsPanel from "./components/EventsPanel.vue";
import PreferenceSelects from "./components/PreferenceSelects.vue";
import WelcomeDialog from "./components/WelcomeDialog.vue";
import AppIcon from "./components/AppIcon.vue";
import {locale, setLanguage, translate} from "./i18n";
import {primeLocale} from "./i18n/prime";
import {appPreferencesKey} from "./appPreferences";
import {useTheme} from "./composables/useTheme";

const route = useRoute();
const router = useRouter();
const prime = usePrimeVue();
const {paletteMode, themeChoice, setTheme} = useTheme();
provide(appPreferencesKey, {language: locale, themeChoice, setLanguage, setTheme});

const bypassProvisioning = ref(false);
const capabilities = useQuery(capabilitiesQuery);
const information = useQuery(valetudoInformationQuery);
const wifiEnabled = computed(() => information.data.value?.embedded === true && capabilities.data.value?.includes(Capability.WifiConfiguration) === true && !bypassProvisioning.value);
const wifi = useQuery({...wifiStatusQuery, enabled: wifiEnabled});
const loading = computed(() => capabilities.isPending.value || information.isPending.value || (wifiEnabled.value && wifi.isPending.value));
const failed = computed(() => capabilities.isError.value || information.isError.value || (wifiEnabled.value && wifi.isError.value));
const ready = computed(() => !loading.value && !failed.value);
const showChrome = computed(() => ready.value && !route.meta.bare);

const pageTitle = computed(() => translate(route.meta.title ?? "Valetudo"));
const parentPage = computed(() => route.meta.parent && {to: route.meta.parent.to, label: translate(route.meta.parent.label)});

watch(() => wifi.data.value?.state, state => {
    if (state === "connected") {
        bypassProvisioning.value = true;
        if (route.path === "/setup") void router.replace("/");
    } else if (state === "not_connected") {
        void router.replace("/setup");
    }
}, {immediate: true});

watch([() => route.meta.title, locale], ([title, language]) => {
    document.documentElement.lang = language;
    Object.assign(prime.config.locale!, primeLocale(language));
    document.title = route.path === "/" || !title ? "Valetudo" : `Valetudo - ${translate(title)}`;
}, {immediate: true});

function retry() {
    if (capabilities.isError.value) void capabilities.refetch();
    if (information.isError.value) void information.refetch();
    if (wifi.isError.value) void wifi.refetch();
}
</script>

<template>
    <div class="app-frame" :class="{'app-frame-no-sidebar': !showChrome}">
        <AppNavigation v-if="showChrome" variant="desktop" :capabilities="capabilities.data.value ?? []" />
        <div class="app-main">
            <header class="app-topbar">
                <div class="app-breadcrumb"><span class="breadcrumb-prefix">Valetudo <span>/</span></span><template v-if="parentPage"><span class="breadcrumb-prefix">{{ parentPage.label }} <span>/</span></span></template>{{ pageTitle }}</div>
                <div class="app-topbar-tools">
                    <EventsPanel v-if="ready" />
                    <PreferenceSelects layout="toolbar" />
                </div>
            </header>
            <main class="app-content">
                <RouterLink v-if="parentPage && ready" class="app-back-link" :to="parentPage.to">
                    <AppIcon name="chevron-left" />
                    <span>{{ $t("Back to {section}", {section: parentPage.label}) }}</span>
                </RouterLink>
                <div v-if="loading" class="panel" role="status">{{ $t("Loading robot capabilities and Valetudo information…") }}</div>
                <div v-else-if="failed" class="panel flex flex-col items-start gap-4">
                    <Message severity="error">{{ $t("Unable to connect to Valetudo.") }}</Message>
                    <Button :label='$t("Retry")' @click="retry" />
                </div>
                <RouterView v-else :capabilities="capabilities.data.value ?? []" :information="information.data.value" :palette-mode="paletteMode" />
            </main>
        </div>
        <AppNavigation v-if="showChrome" variant="mobile" :capabilities="capabilities.data.value ?? []" />
        <WelcomeDialog v-if="showChrome && information.data.value" :capabilities="capabilities.data.value ?? []" :information="information.data.value" />
    </div>
</template>
