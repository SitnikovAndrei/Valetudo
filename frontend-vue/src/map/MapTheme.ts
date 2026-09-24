export type MapTheme = {
    mode: "light" | "dark";
    accent: string;
    surface: string;
    text: string;
    path: string;
    noGo: string;
    noMop: string;
    structure: string;
    obstacle: string;
    zoneFill: string;
    editLine: string;
    carpetFill: string;
    carpetLine: string;
    carpetBorder: string;
};

const tokens: Record<Exclude<keyof MapTheme, "mode">, string> = {
    accent: "--app-accent",
    surface: "--app-surface",
    text: "--app-text",
    path: "--map-path",
    noGo: "--map-no-go",
    noMop: "--map-no-mop",
    structure: "--map-structure",
    obstacle: "--map-obstacle",
    zoneFill: "--map-zone-fill",
    editLine: "--map-edit-line",
    carpetFill: "--map-carpet-fill",
    carpetLine: "--map-carpet-line",
    carpetBorder: "--map-carpet-border"
};

/** Reads the map colors from the CSS custom properties defined in styles/tokens.css. */
export function readMapTheme(mode: "light" | "dark", element: Element = document.documentElement): MapTheme {
    const style = getComputedStyle(element);
    const theme = {mode} as MapTheme;
    for (const [name, property] of Object.entries(tokens) as [keyof typeof tokens, string][]) {
        theme[name] = style.getPropertyValue(property).trim() || "#808080";
    }
    return theme;
}
