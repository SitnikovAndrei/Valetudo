import type {InjectionKey, Ref} from "vue";
import type {Language} from "./i18n";

export type ThemeChoice = "system" | "light" | "dark";

export interface AppPreferences {
    language: Ref<Language>;
    themeChoice: Readonly<Ref<ThemeChoice>>;
    setLanguage: (language: Language) => void;
    setTheme: (theme: ThemeChoice) => void;
}

export const appPreferencesKey: InjectionKey<AppPreferences> = Symbol("appPreferences");
