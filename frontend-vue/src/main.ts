import {createApp} from "vue";
import {VueQueryPlugin} from "@tanstack/vue-query";
import {queryClient} from "./api/queries";
import PrimeVue from "primevue/config";
import {definePreset} from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import App from "./App.vue";
import router from "./router";
import {i18n} from "./i18n";
import "./styles/index.css";

const ValetudoPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: "#eaf5ee",
            100: "#d5eadc",
            200: "#add5be",
            300: "#86cba2",
            400: "#55a579",
            500: "#246e53",
            600: "#205e48",
            700: "#194a39",
            800: "#123b2d",
            900: "#0e3024",
            950: "#082017"
        },
        // Neutral surfaces tinted towards the app's green palette so PrimeVue inputs match --app-surface in dark mode.
        colorScheme: {
            dark: {
                surface: {
                    0: "#ffffff", 50: "#edf5ed", 100: "#d9e6db", 200: "#b8c9ba", 300: "#9caf9f", 400: "#7d9282",
                    500: "#5f7566", 600: "#43584b", 700: "#365044", 800: "#21332b", 900: "#1d2d26", 950: "#15231e"
                }
            }
        }
    }
});

createApp(App)
    .use(VueQueryPlugin, {queryClient})
    .use(router)
    .use(i18n)
    .use(PrimeVue, {
        theme: {
            preset: ValetudoPreset,
            options: {
                darkModeSelector: ".dark",
                cssLayer: {name: "primevue", order: "theme, base, primevue, components, utilities"}
            }
        }
    })
    .mount("#app");
