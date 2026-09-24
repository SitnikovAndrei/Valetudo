import type {ValetudoDataPoint} from "./api/types";

export function formatStatisticsValue(point: Pick<ValetudoDataPoint, "type" | "value">): string {
    switch (point.type) {
        case "count": return String(point.value);
        case "time": return `${Math.floor(point.value / 3600).toString().padStart(2, "0")}h ${Math.floor((point.value % 3600) / 60).toString().padStart(2, "0")}m ${(point.value % 60).toString().padStart(2, "0")}s`;
        case "area": return `${(point.value / 10000).toFixed(2)} m²`;
    }
}
