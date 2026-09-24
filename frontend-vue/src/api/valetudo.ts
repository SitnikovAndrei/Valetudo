/* Valetudo itself: information, log, system info, events, timers, updater and customizations. */
import {get, put, post, del, subscribeToSSE} from "./http";
import {
    type LogLevelResponse,
    type SetLogLevelRequest,
    type SystemHostInfo,
    type SystemRuntimeInfo,
    type Timer,
    type TimerInformation,
    type TimerProperties,
    type UpdaterConfiguration,
    type UpdaterState,
    type ValetudoCustomizations,
    type ValetudoEvent,
    type ValetudoEventInteractionContext,
    type ValetudoInformation,
    type ValetudoVersion,
} from "./types";

export const fetchValetudoInformation = async (): Promise<ValetudoInformation> => {
    return get<ValetudoInformation>("/valetudo");
};

export const sendDismissWelcomeDialogAction = async (): Promise<void> => {
    await put("/valetudo/action", {"action": "dismissWelcomeDialog"}, "Could not dismiss welcome dialog");
};

export const sendRestoreDefaultConfigurationAction = async (): Promise<void> => {
    await put("/valetudo/action", {"action": "restoreDefaultConfiguration"}, "Could not restore default configuration.");
};

export const fetchValetudoVersionInformation = async (): Promise<ValetudoVersion> => {
    return get<ValetudoVersion>("/valetudo/version");
};

export const fetchValetudoLog = async (): Promise<string> => {
    return get<string>("/valetudo/log/content");
};

export const subscribeToLogMessages = (
    listener: (data: string) => void
): (() => void) => {
    return subscribeToSSE<string>(
        "/valetudo/log/content/sse",
        "LogMessage",
        (data) => {
            return listener(data);
        },
        true
    );
};

export const fetchValetudoLogLevel = async (): Promise<LogLevelResponse> => {
    return get<LogLevelResponse>("/valetudo/log/level");
};

export const sendValetudoLogLevel = async (logLevel: SetLogLevelRequest): Promise<void> => {
    await put("/valetudo/log/level", logLevel, "Could not set new log level");
};

export const fetchSystemHostInfo = async (): Promise<SystemHostInfo> => {
    return get<SystemHostInfo>("/system/host/info");
};

export const fetchSystemRuntimeInfo = async (): Promise<SystemRuntimeInfo> => {
    return get<SystemRuntimeInfo>("/system/runtime/info");
};

export const fetchTimerInformation = async (): Promise<TimerInformation> => {
    return get<TimerInformation>("/timers");
};

export const deleteTimer = async (id: string): Promise<void> => {
    await del(`/timers/${id}`);
};

export const sendTimerCreation = async (timerData: Timer): Promise<void> => {
    await post("/timers", timerData, "Could not create timer");
};

export const sendTimerUpdate = async (timerData: Timer): Promise<void> => {
    await put(`/timers/${timerData.id}`, timerData, "Could not update timer");
};

export const sendTimerAction = async (timerId: string, timerAction: "execute_now"): Promise<void> => {
    await put(`/timers/${timerId}/action`, {action: timerAction}, "Could not send timer action");
};

export const fetchTimerProperties = async (): Promise<TimerProperties> => {
    return get<TimerProperties>("/timers/properties");
};

export const fetchValetudoEvents = async (): Promise<Array<ValetudoEvent>> => {
    return get<Array<ValetudoEvent>>("/events");
};

export const sendValetudoEventInteraction = async (interaction: ValetudoEventInteractionContext): Promise<void> => {
    await put(`/events/${interaction.id}/interact`, interaction.interaction, "Could not interact with event");
};

export const fetchUpdaterConfiguration = async (): Promise<UpdaterConfiguration> => {
    return get<UpdaterConfiguration>("/updater/config");
};

export const sendUpdaterConfiguration = async (configuration: UpdaterConfiguration): Promise<void> => {
    return put("/updater/config", configuration, "Could not update updater configuration");
};

export const fetchUpdaterState = async (): Promise<UpdaterState> => {
    return get<UpdaterState>("/updater/state");
};

export const sendUpdaterCommand = async (
    command: "check" | "download" | "apply"
): Promise<void> => {
    await put("/updater", {"action": command});
};

export const fetchValetudoCustomizations = async (): Promise<ValetudoCustomizations> => {
    return get<ValetudoCustomizations>("/valetudo/config/customizations");
};

export const sendValetudoCustomizations = async (customizations: ValetudoCustomizations): Promise<void> => {
    return put("/valetudo/config/customizations", customizations, "Could not update ValetudoCustomizations");
};
