import {computed} from "vue";
import {useMutation, useQueryClient} from "@tanstack/vue-query";
import {Capability} from "../api/types";
import {RobotAttributeClass, type RobotAttribute} from "../api/RawRobotState";
import {sendAutoEmptyDockManualTriggerCommand, sendMopDockCleanManualTriggerCommand, sendMopDockDryManualTriggerCommand} from "../api/client";

type DockAction = "empty" | "clean" | "dry" | "stop_clean" | "stop_dry";
type DockActionOption = {capability: Capability; id: DockAction; label: string; enabled: boolean};

export function useDockActions(options: {capabilities: () => Capability[]; attributes: () => RobotAttribute[]}) {
    const robotState = computed(() => options.attributes().find(attribute => attribute.__class === RobotAttributeClass.StatusState)?.value);
    const dockState = computed(() => options.attributes().find(attribute => attribute.__class === RobotAttributeClass.DockStatusState)?.value ?? "idle");
    const mopAttached = computed(() => options.attributes().some(attribute => attribute.__class === RobotAttributeClass.AttachmentState && attribute.type === "mop" && attribute.attached));
    const dockStateKnown = computed(() => !options.capabilities().some(capability => [Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability)) || options.attributes().some(attribute => attribute.__class === RobotAttributeClass.DockStatusState));
    const canEmpty = computed(() => dockStateKnown.value && robotState.value === "docked" && ["idle", "pause"].includes(dockState.value));
    const canClean = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "cleaning", "pause"].includes(dockState.value));
    const canDry = computed(() => dockStateKnown.value && robotState.value === "docked" && mopAttached.value && ["idle", "drying", "pause"].includes(dockState.value));
    const hasDockActions = computed(() => options.capabilities().some(capability => [Capability.AutoEmptyDockManualTrigger, Capability.MopDockCleanManualTrigger, Capability.MopDockDryManualTrigger].includes(capability)));
    const queryClient = useQueryClient();
    const dockMutation = useMutation({onSuccess: () => queryClient.invalidateQueries({queryKey: ["robotAttributes"]}), mutationFn: async (action: DockAction) => {
        if (action === "empty") return sendAutoEmptyDockManualTriggerCommand();
        if (action === "clean" || action === "stop_clean") return sendMopDockCleanManualTriggerCommand(action === "clean" ? "start" : "stop");
        return sendMopDockDryManualTriggerCommand(action === "dry" ? "start" : "stop");
    }});
    const actions = computed(() => ([
        {capability: Capability.AutoEmptyDockManualTrigger, id: "empty", label: "Empty dustbin", enabled: canEmpty.value},
        {capability: Capability.MopDockCleanManualTrigger, id: dockState.value === "cleaning" ? "stop_clean" : "clean", label: dockState.value === "cleaning" ? "Stop mop cleaning" : "Clean mop", enabled: canClean.value},
        {capability: Capability.MopDockDryManualTrigger, id: dockState.value === "drying" ? "stop_dry" : "dry", label: dockState.value === "drying" ? "Stop mop drying" : "Dry mop", enabled: canDry.value}
    ] satisfies DockActionOption[]).filter(action => options.capabilities().includes(action.capability)));
    return {actions, hasDockActions, dockState, canEmpty, canClean, canDry, dockMutation};
}
