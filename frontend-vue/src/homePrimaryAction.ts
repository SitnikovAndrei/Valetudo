import type {StatusState} from "./api/RawRobotState";
import type {CleaningMode} from "./composables/useMapCleaning";
import {isBasicCommandEnabled} from "./basicControl";

export type HomePrimaryAction = "pause" | "start" | "selection";

/** Pausing and resuming the current job take priority over a new map selection. */
export function homePrimaryAction(status: StatusState | undefined, mode: CleaningMode): HomePrimaryAction {
    if (isBasicCommandEnabled("pause", status)) return "pause";
    if (status?.value === "paused" || status?.flag === "resumable") return "start";
    return mode === "all" ? "start" : "selection";
}
