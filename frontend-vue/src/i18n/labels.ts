import {translate} from "./index";
import {ru} from "./ru";

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
