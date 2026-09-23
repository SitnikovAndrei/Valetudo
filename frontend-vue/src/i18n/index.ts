import {createI18n} from "vue-i18n";
import {en} from "./en";
import {ru} from "./ru";

export type Language = "ru" | "en";
const storageKey = "ui-language";
const saved = localStorage.getItem(storageKey);
const initialLanguage: Language = saved === "en" ? "en" : "ru";

export const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: initialLanguage,
    fallbackLocale: "en",
    messages: {ru, en},
    messageResolver: (messages, key) => (messages as Record<string, string>)[key],
    missingWarn: false,
    fallbackWarn: false
});

export function setLanguage(language: Language) {
    i18n.global.locale.value = language;
    localStorage.setItem(storageKey, language);
}

export function translate(key: string, named?: Record<string, string | number>): string {
    return i18n.global.t(key, named ?? {});
}
