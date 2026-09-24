import {useMutation, useQueryClient} from "@tanstack/vue-query";
import type {StatusState} from "../api/RawRobotState";
import {fetchStateAttributes, sendBasicControlCommand, type BasicControlCommand} from "../api/client";
import {isBasicCommandEnabled} from "../basicControl";

/** Start/pause/stop/dock commands shared by the desktop and mobile control layouts. */
export function useBasicControl(options: {status: () => StatusState | undefined; blocked: () => boolean}) {
    const queryClient = useQueryClient();
    const command = useMutation({
        mutationFn: async (action: BasicControlCommand) => {
            await sendBasicControlCommand(action);
            return fetchStateAttributes();
        },
        onSuccess: data => queryClient.setQueryData(["robotAttributes"], data)
    });

    function enabled(action: BasicControlCommand): boolean {
        return isBasicCommandEnabled(action, options.status()) && !options.blocked() && !command.isPending.value;
    }

    function label(action: BasicControlCommand): string {
        if (action === "start") return options.status()?.flag === "resumable" ? "Resume" : "Start cleaning";
        if (action === "home") return "Dock";
        return action === "pause" ? "Pause" : "Stop action";
    }

    function send(action: BasicControlCommand) {
        if (enabled(action)) command.mutate(action);
    }

    function running(action: BasicControlCommand): boolean {
        return command.isPending.value && command.variables.value === action;
    }

    return {command, enabled, label, send, running};
}

export type BasicControl = ReturnType<typeof useBasicControl>;
