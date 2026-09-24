import {readonly, ref, type App} from "vue";
import {ru} from "./ru";

export type Language = "ru" | "en";

const storageKey = "ui-language";
const catalogs: Record<Language, Record<string, string>> = {ru, en: {}};

function readStoredLanguage(): Language {
    try {
        return localStorage.getItem(storageKey) === "en" ? "en" : "ru";
    } catch {
        return "ru";
    }
}

const current = ref<Language>(readStoredLanguage());

/** Active UI language. Read-only: change it with setLanguage(). */
export const locale = readonly(current);

export function setLanguage(language: Language) {
    current.value = language;
    try {
        localStorage.setItem(storageKey, language);
    } catch {
        // The choice still applies for this session.
    }
}

/**
 * English source text is the message key; missing translations fall back to the key.
 * Placeholders use the `{name}` syntax. Reading `current` makes callers reactive to language changes.
 */
export function translate(key: string, named?: Record<string, string | number>): string {
    const message = catalogs[current.value][key] ?? key;
    if (!named) return message;
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => name in named ? String(named[name]) : placeholder);
}

export const i18n = {
    install(app: App) {
        app.config.globalProperties.$t = translate;
    }
};

declare module "vue" {
    interface ComponentCustomProperties {
        $t: typeof translate;
    }
}
