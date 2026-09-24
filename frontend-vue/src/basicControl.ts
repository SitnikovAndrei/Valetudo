import type {StatusState} from "./api/RawRobotState";
import type {BasicControlCommand} from "./api/client";

const startStates: StatusState["value"][] = ["idle", "docked", "paused", "error"];
const pauseStates: StatusState["value"][] = ["cleaning", "returning", "moving"];

export function isBasicCommandEnabled(command: BasicControlCommand, status: StatusState | undefined): boolean {
    if (!status) return false;
    const {flag, value} = status;

    switch (command) {
        case "start": return startStates.includes(value);
        case "pause": return pauseStates.includes(value);
        case "stop": return flag === "resumable" || (value !== "idle" && value !== "docked");
        case "home": return value === "idle" || value === "error" || value === "paused";
    }
}
