import type {Language} from "./i18n";

export function formatMinutes(minutes: number, language: Language): string {
    const total = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
    const parts = [
        {unit: "day", value: Math.floor(total / 1440)},
        {unit: "hour", value: Math.floor(total % 1440 / 60)},
        {unit: "minute", value: total % 60}
    ];
    const first = parts.findIndex(part => part.value > 0);
    return parts.slice(first < 0 ? 2 : first).map(part => new Intl.NumberFormat(language, {style: "unit", unit: part.unit, unitDisplay: "long"}).format(part.value)).join(" ");
}
