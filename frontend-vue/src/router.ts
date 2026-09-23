import {createRouter, createWebHashHistory} from "vue-router";
import HomePage from "./pages/HomePage.vue";
import ProvisioningPage from "./pages/ProvisioningPage.vue";

export default createRouter({
    history: createWebHashHistory(),
    scrollBehavior: () => ({top: 0}),
    routes: [
        {path: "/", component: HomePage},
        {path: "/setup", component: ProvisioningPage},
        {path: "/robot/total_statistics", component: () => import("./pages/TotalStatisticsPage.vue")},
        {path: "/robot/consumables", component: () => import("./pages/ConsumablesPage.vue")},
        {path: "/valetudo/system_information", component: () => import("./pages/SystemInformationPage.vue")},
        {path: "/valetudo/log", component: () => import("./pages/LogPage.vue")},
        {path: "/options/connectivity", component: () => import("./pages/ConnectivityPage.vue")},
        {path: "/options/connectivity/auth", component: () => import("./pages/AuthSettingsPage.vue")},
        {path: "/options/connectivity/networkadvertisement", component: () => import("./pages/NetworkAdvertisementPage.vue")},
        {path: "/options/connectivity/ntp", component: () => import("./pages/NTPPage.vue")},
        {path: "/options/connectivity/wifi", component: () => import("./pages/WifiConnectivityPage.vue")},
        {path: "/options/map_management", component: () => import("./pages/MapManagementPage.vue")},
        {path: "/options/valetudo", component: () => import("./pages/ValetudoOptionsPage.vue")},
        {path: "/options/robot/quirks", component: () => import("./pages/QuirksPage.vue")},
        {path: "/valetudo/updater", component: () => import("./pages/UpdaterPage.vue")},
        {path: "/valetudo/timers", component: () => import("./pages/TimersPage.vue")},
        {path: "/options/robot", component: () => import("./pages/RobotOptionsPage.vue")},
        {path: "/options/robot/system", component: () => import("./pages/SystemRobotOptionsPage.vue")},
        {path: "/options/connectivity/mqtt", component: () => import("./pages/MQTTPage.vue")},
        {path: "/robot/manual_control", component: () => import("./pages/ManualControlPage.vue")},
        {path: "/robot/camera", component: () => import("./pages/CameraPage.vue")},
        {path: "/options/map_management/spectator", component: () => import("./pages/SpectatorPage.vue")},
        {path: "/options/map_management/virtual_restrictions", component: () => import("./pages/VirtualRestrictionsPage.vue")},
        {path: "/options/map_management/annotations", component: () => import("./pages/MapAnnotationsPage.vue")},
        {path: "/options/map_management/segments", component: () => import("./pages/SegmentsPage.vue")},
        {path: "/options/map_management/robot_coverage", component: () => import("./pages/RobotCoveragePage.vue")},
        {path: "/valetudo/about", component: () => import("./pages/MarkdownPage.vue"), props: {page: "about"}},
        {path: "/valetudo/help", component: () => import("./pages/MarkdownPage.vue"), props: {page: "help"}},
        {path: "/options/valetudo/analytics", component: () => import("./pages/AnalyticsPage.vue")},
        {path: "/valetudo/ai", component: () => import("./pages/AIPage.vue")},
        {path: "/:pathMatch(.*)*", redirect: "/"}
    ]
});
