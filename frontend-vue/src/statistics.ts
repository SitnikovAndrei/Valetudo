import type {ValetudoDataPoint} from "./api/types";
import {locale, type Language} from "./i18n";

const units: Record<Language, {area: string}> = {
    ru: {area: "м²"},
    en: {area: "m²"}
};

function unit(value: number, name: "hour" | "minute" | "second", language: Language): string {
    return new Intl.NumberFormat(language, {style: "unit", unit: name, unitDisplay: "short"}).format(value);
}

/** Seconds as "2 ч 5 мин" / "2 hr 5 min"; seconds are only shown for durations under an hour. */
export function formatSeconds(seconds: number, language: Language = locale.value): string {
    const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const rest = total % 60;
    if (hours > 0) return [unit(hours, "hour", language), unit(minutes, "minute", language)].join(" ");
    if (minutes > 0) return [unit(minutes, "minute", language), ...(rest ? [unit(rest, "second", language)] : [])].join(" ");
    return unit(rest, "second", language);
}

export function formatStatisticsValue(point: Pick<ValetudoDataPoint, "type" | "value">, language: Language = locale.value): string {
    switch (point.type) {
        case "count": return new Intl.NumberFormat(language).format(point.value);
        case "time": return formatSeconds(point.value, language);
        case "area": return `${new Intl.NumberFormat(language, {maximumFractionDigits: 1}).format(point.value / 10000)} ${units[language].area}`;
    }
}

export function formatDateTime(value: string | number | Date, language: Language = locale.value): string {
    return new Date(value).toLocaleString(language, {dateStyle: "medium", timeStyle: "short", hourCycle: "h23"});
}
