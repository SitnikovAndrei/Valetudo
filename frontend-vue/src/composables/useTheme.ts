import {computed, onScopeDispose, ref, watch} from "vue";
import type {ThemeChoice} from "../appPreferences";

export type PaletteMode = "light" | "dark";

const storageKey = "palette-mode";

function readStored(): PaletteMode | undefined {
    try {
        const saved = localStorage.getItem(storageKey);
        return saved === "light" || saved === "dark" ? saved : undefined;
    } catch {
        return undefined;
    }
}

function store(value: PaletteMode | undefined) {
    try {
        if (value) localStorage.setItem(storageKey, value);
        else localStorage.removeItem(storageKey);
    } catch {
        // Preference applies for this session only.
    }
}

/** Light/dark palette that follows the system unless the user picked one explicitly. */
export function useTheme() {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const explicit = ref<PaletteMode | undefined>(readStored());
    const system = ref<PaletteMode>(media.matches ? "dark" : "light");
    const paletteMode = computed<PaletteMode>(() => explicit.value ?? system.value);
    const themeChoice = computed<ThemeChoice>(() => explicit.value ?? "system");

    const onSystemChange = (event: MediaQueryListEvent) => {
        system.value = event.matches ? "dark" : "light";
    };
    media.addEventListener("change", onSystemChange);
    onScopeDispose(() => media.removeEventListener("change", onSystemChange));

    watch(paletteMode, value => {
        document.documentElement.classList.toggle("dark", value === "dark");
        document.querySelector("meta[name=theme-color]")?.setAttribute("content", value === "dark" ? "#15231e" : "#f3f5f0");
    }, {immediate: true});

    function setTheme(value: ThemeChoice) {
        explicit.value = value === "system" ? undefined : value;
        store(explicit.value);
    }

    return {paletteMode, themeChoice, setTheme};
}
