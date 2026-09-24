import {translate} from "./index";
import {ru} from "./ru";
import type {ConsumableSubType, ConsumableType} from "../api/types";

const knownValues: Record<string, string> = {
    segments: "Segments", zones: "Zones", goto: "Point", pan: "Pan",
    ValetudoUpdaterIdleState: "Idle",
    ValetudoUpdaterErrorState: "Error",
    ValetudoUpdaterNoUpdateRequiredState: "No update required",
    ValetudoUpdaterApprovalPendingState: "Approval pending",
    ValetudoUpdaterApplyPendingState: "Apply pending",
    ValetudoUpdaterDownloadingState: "Downloading",
    ValetudoUpdaterDisabledState: "Disabled",
    ValetudoNTPClientDisabledState: "NTP disabled",
    ValetudoNTPClientEnabledState: "NTP enabled",
    ValetudoNTPClientErrorState: "NTP error",
    ValetudoNTPClientSyncedState: "Time synchronized"
};

export function valueLabel(value: string | undefined | null): string {
    if (!value) return "";
    const key = knownValues[value] ?? value;
    return Object.prototype.hasOwnProperty.call(ru, key) ? translate(key) : value;
}

const consumableNames: Partial<Record<ConsumableType, Partial<Record<ConsumableSubType, string>>>> = {
    brush: {main: "Main brush", secondary: "Secondary brush", side_left: "Left side brush", side_right: "Right side brush", dock: "Dock brush"},
    filter: {main: "Main filter", secondary: "Secondary filter", dock: "Dock filter"},
    mop: {none: "Mop pads", main: "Main mop", all: "Mop pads"},
    detergent: {dock: "Dock detergent"},
    bin: {dock: "Dock bin"},
    cleaning: {none: "Cleaning", sensor: "Sensor cleaning", wheel: "Wheel cleaning"}
};

export function consumableName(type: ConsumableType | undefined, subType: ConsumableSubType | undefined): string {
    const key = type && subType ? consumableNames[type]?.[subType] : undefined;
    if (key) return translate(key);
    if (!subType || subType === "none" || subType === "all") return valueLabel(type);
    return [valueLabel(subType), valueLabel(type)].filter(Boolean).join(" ");
}
