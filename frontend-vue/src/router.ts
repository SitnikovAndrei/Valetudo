import {createRouter, createWebHashHistory, type RouteLocationRaw, type RouteRecordRaw} from "vue-router";
import {Capability} from "./api/types";
import {capabilitiesQuery, duststreamConfigurationQuery, queryClient} from "./api/queries";
import HomePage from "./pages/HomePage.vue";
import ProvisioningPage from "./pages/ProvisioningPage.vue";

type SettingsSection = "map" | "connectivity" | "robot" | "valetudo";

declare module "vue-router" {
    interface RouteMeta {
        /** English source text of the page title; translated when displayed. */
        title?: string;
        /** Where the "Back to …" link leads, with the English label of that page. */
        parent?: {to: RouteLocationRaw; label: string};
        /** The page is only reachable if the robot has at least one of these capabilities. */
        requires?: Capability[];
        /** The page needs an enabled duststream camera. */
        requiresCamera?: boolean;
        /** Hides the navigation chrome (Wi-Fi provisioning). */
        bare?: boolean;
    }
}

const settings = (section: SettingsSection) => ({to: {path: "/options", query: {section}}, label: "Settings"});
const mapOptions = {to: "/options/map_management", label: "Map options"};
const connectivity = {to: "/options/connectivity", label: "Connectivity"};
const robotOptions = {to: "/options/robot", label: "Robot options"};

export const routes: RouteRecordRaw[] = [
    {path: "/", component: HomePage, meta: {title: "Map and controls"}},
    {path: "/setup", component: ProvisioningPage, meta: {title: "Wi-Fi connectivity", bare: true}},
    {path: "/options", component: () => import("./pages/SettingsPage.vue"), meta: {title: "Settings"}},

    {path: "/valetudo/timers", component: () => import("./pages/TimersPage.vue"), meta: {title: "Timers"}},
    {path: "/robot/total_statistics", component: () => import("./pages/TotalStatisticsPage.vue"), meta: {title: "Total statistics", requires: [Capability.TotalStatistics]}},
    {path: "/robot/consumables", component: () => import("./pages/ConsumablesPage.vue"), meta: {title: "Consumables", requires: [Capability.ConsumableMonitoring]}},

    {path: "/options/map_management", component: () => import("./pages/MapManagementPage.vue"), meta: {title: "Map options", parent: settings("map")}},
    {path: "/options/map_management/segments", component: () => import("./pages/SegmentsPage.vue"), meta: {title: "Segment management", parent: mapOptions, requires: [Capability.MapSegmentEdit, Capability.MapSegmentRename, Capability.MapSegmentMaterialControl]}},
    {path: "/options/map_management/virtual_restrictions", component: () => import("./pages/VirtualRestrictionsPage.vue"), meta: {title: "Virtual restrictions", parent: mapOptions, requires: [Capability.CombinedVirtualRestrictions]}},
    {path: "/options/map_management/annotations", component: () => import("./pages/MapAnnotationsPage.vue"), meta: {title: "Map annotations", parent: mapOptions, requires: [Capability.MapAnnotations]}},
    {path: "/options/map_management/spectator", component: () => import("./pages/SpectatorPage.vue"), meta: {title: "Spectator map", parent: mapOptions, requiresCamera: true}},
    {path: "/options/map_management/robot_coverage", component: () => import("./pages/RobotCoveragePage.vue"), meta: {title: "Robot coverage map", parent: mapOptions}},

    {path: "/options/connectivity", component: () => import("./pages/ConnectivityPage.vue"), meta: {title: "Connectivity", parent: settings("connectivity")}},
    {path: "/options/connectivity/auth", component: () => import("./pages/AuthSettingsPage.vue"), meta: {title: "HTTP Basic Auth", parent: connectivity}},
    {path: "/options/connectivity/mqtt", component: () => import("./pages/MQTTPage.vue"), meta: {title: "MQTT connectivity", parent: connectivity}},
    {path: "/options/connectivity/networkadvertisement", component: () => import("./pages/NetworkAdvertisementPage.vue"), meta: {title: "Network advertisement", parent: connectivity}},
    {path: "/options/connectivity/ntp", component: () => import("./pages/NTPPage.vue"), meta: {title: "NTP", parent: connectivity}},
    {path: "/options/connectivity/wifi", component: () => import("./pages/WifiConnectivityPage.vue"), meta: {title: "Wi-Fi connectivity", parent: connectivity, requires: [Capability.WifiConfiguration]}},

    {path: "/options/robot", component: () => import("./pages/RobotOptionsPage.vue"), meta: {title: "Robot options", parent: settings("robot")}},
    {path: "/options/robot/system", component: () => import("./pages/SystemRobotOptionsPage.vue"), meta: {title: "Robot system options", parent: robotOptions}},
    {path: "/options/robot/quirks", component: () => import("./pages/QuirksPage.vue"), meta: {title: "Quirks", parent: robotOptions, requires: [Capability.Quirks]}},
    {path: "/robot/manual_control", component: () => import("./pages/ManualControlPage.vue"), meta: {title: "Manual control", parent: settings("robot"), requires: [Capability.ManualControl, Capability.HighResolutionManualControl]}},
    {path: "/robot/camera", component: () => import("./pages/CameraPage.vue"), meta: {title: "Camera", parent: settings("robot"), requiresCamera: true}},

    {path: "/options/valetudo", component: () => import("./pages/ValetudoOptionsPage.vue"), meta: {title: "Valetudo options", parent: settings("valetudo")}},
    {path: "/valetudo/system_information", component: () => import("./pages/SystemInformationPage.vue"), meta: {title: "System information", parent: settings("valetudo")}},
    {path: "/valetudo/log", component: () => import("./pages/LogPage.vue"), meta: {title: "Log", parent: settings("valetudo")}},
    {path: "/valetudo/updater", component: () => import("./pages/UpdaterPage.vue"), meta: {title: "Updater", parent: settings("valetudo")}},
    {path: "/valetudo/ai", component: () => import("./pages/AIPage.vue"), meta: {title: "AI Assistant", parent: settings("valetudo")}},
    {path: "/valetudo/help", component: () => import("./pages/MarkdownPage.vue"), props: {page: "help"}, meta: {title: "Help", parent: settings("valetudo")}},
    {path: "/valetudo/about", component: () => import("./pages/MarkdownPage.vue"), props: {page: "about"}, meta: {title: "About", parent: settings("valetudo")}},

    {path: "/:pathMatch(.*)*", redirect: "/"}
];

const router = createRouter({
    history: createWebHashHistory(),
    scrollBehavior: () => ({top: 0}),
    routes
});

/** Keeps users out of pages the robot cannot support before the page mounts and starts requesting data. */
router.beforeEach(async to => {
    const {requires, requiresCamera} = to.meta;
    if (!requires && !requiresCamera) return true;
    try {
        const capabilities = await queryClient.ensureQueryData(capabilitiesQuery);
        if (requires && !requires.some(capability => capabilities.includes(capability))) return "/";
        if (requiresCamera) {
            if (!capabilities.includes(Capability.Duststreaming)) return "/";
            const camera = await queryClient.ensureQueryData(duststreamConfigurationQuery);
            if (!camera.enabled) return "/";
        }
        return true;
    } catch {
        // App.vue shows the connection error and a retry button.
        return true;
    }
});

export default router;
