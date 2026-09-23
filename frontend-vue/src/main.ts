import {createApp} from "vue";
import {VueQueryPlugin} from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import {definePreset} from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import App from "./App.vue";
import router from "./router";
import {i18n} from "./i18n";
import "./style.css";

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
        }
    }
});

createApp(App)
    .use(VueQueryPlugin)
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
