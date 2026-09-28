export type QuirkKind = "toggle" | "action" | "segmented" | "select";

export function quirkKind(options: readonly string[]): QuirkKind {
    if (options.includes("on") && options.includes("off")) return "toggle";
    if (options.length === 2 && options.includes("select_to_trigger") && options.includes("trigger")) return "action";
    return options.length >= 2 && options.length <= 4 ? "segmented" : "select";
}
