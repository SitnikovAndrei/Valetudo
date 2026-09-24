/* Robot state, basic control, consumables, statistics and robot/dock settings. */
import {get, put, subscribeToSSE, sendToggleMutation} from "./http";
import type {PresetSelectionState, PresetValue, RobotAttribute} from "./RawRobotState";
import {
    Capability,
    type AutoEmptyDockAutoEmptyDuration,
    type AutoEmptyDockAutoEmptyDurationControlProperties,
    type AutoEmptyDockAutoEmptyDurationPayload,
    type AutoEmptyDockAutoEmptyInterval,
    type AutoEmptyDockAutoEmptyIntervalPayload,
    type AutoEmptyDockAutoEmptyIntervalProperties,
    type CarpetSensorMode,
    type CarpetSensorModeControlProperties,
    type CarpetSensorModePayload,
    type CleanRoute,
    type CleanRouteControlProperties,
    type CleanRoutePayload,
    type ConsumableId,
    type ConsumableProperties,
    type ConsumableState,
    type DoNotDisturbConfiguration,
    type HighResolutionManualControlInteraction,
    type ManualControlInteraction,
    type ManualControlProperties,
    type MopDockMopDryingDuration,
    type MopDockMopDryingTimeControlProperties,
    type MopDockMopDryingTimePayload,
    type MopDockMopWashTemperature,
    type MopDockMopWashTemperaturePayload,
    type MopDockMopWashTemperatureProperties,
    type ObstacleImagesProperties,
    type DuststreamingProperties,
    type DuststreamingConfiguration,
    type Quirk,
    type RobotInformation,
    type RobotProperties,
    type SetQuirkValueCommand,
    type SimpleToggleState,
    type SpeakerVolumeState,
    type StatisticsProperties,
    type ValetudoDataPoint,
    type VoicePackManagementCommand,
    type VoicePackManagementStatus,
} from "./types";

export const fetchCapabilities = (): Promise<Capability[]> => {
    return get<Capability[]>("/robot/capabilities");
};

export const fetchStateAttributes = async (): Promise<RobotAttribute[]> => {
    return get<RobotAttribute[]>("/robot/state/attributes");
};

export const subscribeToStateAttributes = (
    listener: (data: RobotAttribute[]) => void
): (() => void) => {
    return subscribeToSSE<RobotAttribute[]>(
        "/robot/state/attributes/sse",
        "StateAttributesUpdated",
        (data) => {
            return listener(data);
        }
    );
};

export const fetchPresetSelections = async (
    capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl
): Promise<Array<PresetValue>> => {
    return get<PresetSelectionState["value"][]>(`/robot/capabilities/${capability}/presets`);
};

export const updatePresetSelection = async (
    capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl,
    level: PresetSelectionState["value"]
): Promise<void> => {
    await put(`/robot/capabilities/${capability}/preset`, {name: level});
};

export type BasicControlCommand = "start" | "stop" | "pause" | "home";
export const sendBasicControlCommand = async (
    command: BasicControlCommand
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.BasicControl}`, {action: command});
};

export const sendLocateCommand = async (): Promise<void> => {
    await put(`/robot/capabilities/${Capability.Locate}`, {action: "locate"});
};

export const sendAutoEmptyDockManualTriggerCommand = async (): Promise<void> => {
    await put(`/robot/capabilities/${Capability.AutoEmptyDockManualTrigger}`, {action: "trigger"});
};

export const fetchConsumableStateInformation = async (): Promise<Array<ConsumableState>> => {
    return get<Array<ConsumableState>>(`/robot/capabilities/${Capability.ConsumableMonitoring}`);
};

export const sendConsumableReset = async (parameters: ConsumableId): Promise<void> => {
    let urlFragment = `${parameters.type}`;
    if (parameters.subType) {
        urlFragment += `/${parameters.subType}`;
    }
    return put(`/robot/capabilities/${Capability.ConsumableMonitoring}/${urlFragment}`, {action: "reset"}, "Could not reset consumable");
};

export const fetchConsumableProperties = async (): Promise<ConsumableProperties> => {
    return get<ConsumableProperties>(`/robot/capabilities/${Capability.ConsumableMonitoring}/properties`);
};

export const fetchRobotInformation = async (): Promise<RobotInformation> => {
    return get<RobotInformation>("/robot");
};

export const fetchSpeakerVolumeState = async (): Promise<SpeakerVolumeState> => {
    return get<SpeakerVolumeState>(`/robot/capabilities/${Capability.SpeakerVolumeControl}`);
};

export const sendSpeakerVolume = async (volume: number): Promise<void> => {
    await put(`/robot/capabilities/${Capability.SpeakerVolumeControl}`, {action: "set_volume", value: volume}, "Could not change speaker volume");
};

export const fetchVoicePackManagementState = async (): Promise<VoicePackManagementStatus> => {
    return get<VoicePackManagementStatus>(`/robot/capabilities/${Capability.VoicePackManagement}`);
};

export const sendVoicePackManagementCommand = async (command: VoicePackManagementCommand): Promise<void> => {
    return put(`/robot/capabilities/${Capability.VoicePackManagement}`, command, "Could not send voice pack management command");
};

export const sendSpeakerTestCommand = async (): Promise<void> => {
    await put(`/robot/capabilities/${Capability.SpeakerTest}`, {action: "play_test_sound"});
};

export const fetchKeyLockState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.KeyLock}`);
};

export const sendKeyLockEnable = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.KeyLock, enable);
};

export const fetchCarpetModeState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.CarpetModeControl}`);
};

export const sendCarpetModeEnable = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.CarpetModeControl, enable);
};

export const fetchObstacleAvoidanceControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.ObstacleAvoidanceControl}`);
};

export const sendObstacleAvoidanceControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.ObstacleAvoidanceControl, enable);
};

export const fetchPetObstacleAvoidanceControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.PetObstacleAvoidanceControl}`);
};

export const sendPetObstacleAvoidanceControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.PetObstacleAvoidanceControl, enable);
};

export const fetchCollisionAvoidantNavigationControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.CollisionAvoidantNavigation}`);
};

export const sendCollisionAvoidantNavigationControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.CollisionAvoidantNavigation, enable);
};

export const fetchDoNotDisturbConfiguration = async (): Promise<DoNotDisturbConfiguration> => {
    return get<DoNotDisturbConfiguration>(`/robot/capabilities/${Capability.DoNotDisturb}`);
};

export const sendDoNotDisturbConfiguration = async (configuration: DoNotDisturbConfiguration): Promise<void> => {
    await put(`/robot/capabilities/${Capability.DoNotDisturb}`, configuration, "Could not update DND configuration");
};

export const fetchManualControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.ManualControl}`);
};

export const fetchManualControlProperties = async (): Promise<ManualControlProperties> => {
    return get<ManualControlProperties>(`/robot/capabilities/${Capability.ManualControl}/properties`);
};

export const sendManualControlInteraction = async (interaction: ManualControlInteraction): Promise<void> => {
    await put(`/robot/capabilities/${Capability.ManualControl}`, interaction, "Could not send manual control interaction");
};

export const fetchHighResolutionManualControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.HighResolutionManualControl}`);
};

export const sendHighResolutionManualControlInteraction = async (interaction: HighResolutionManualControlInteraction): Promise<void> => {
    await put(`/robot/capabilities/${Capability.HighResolutionManualControl}`, interaction, "Could not send high resolution manual control interaction");
};

export const fetchCurrentStatistics = async (): Promise<Array<ValetudoDataPoint>> => {
    return get<Array<ValetudoDataPoint>>(`/robot/capabilities/${Capability.CurrentStatistics}`);
};

export const fetchCurrentStatisticsProperties = async (): Promise<StatisticsProperties> => {
    return get<StatisticsProperties>(`/robot/capabilities/${Capability.CurrentStatistics}/properties`);
};

export const fetchTotalStatistics = async (): Promise<Array<ValetudoDataPoint>> => {
    return get<Array<ValetudoDataPoint>>(`/robot/capabilities/${Capability.TotalStatistics}`);
};

export const fetchTotalStatisticsProperties = async (): Promise<StatisticsProperties> => {
    return get<StatisticsProperties>(`/robot/capabilities/${Capability.TotalStatistics}/properties`);
};

export const fetchQuirks = async (): Promise<Array<Quirk>> => {
    return get<Array<Quirk>>(`/robot/capabilities/${Capability.Quirks}`);
};

export const sendSetQuirkValueCommand = async (command: SetQuirkValueCommand): Promise<void> => {
    await put(`/robot/capabilities/${Capability.Quirks}`, {"id": command.id, "value": command.value});
};

export const fetchRobotProperties = async (): Promise<RobotProperties> => {
    return get<RobotProperties>("/robot/properties");
};

export type MopDockCleanManualTriggerCommand = "start" | "stop";
export const sendMopDockCleanManualTriggerCommand = async (
    command: MopDockCleanManualTriggerCommand
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MopDockCleanManualTrigger}`, {action: command});
};

export type MopDockDryManualTriggerCommand = "start" | "stop";
export const sendMopDockDryManualTriggerCommand = async (
    command: MopDockDryManualTriggerCommand
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MopDockDryManualTrigger}`, {action: command});
};

export const fetchMopExtensionControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.MopExtensionControl}`);
};

export const sendMopExtensionControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.MopExtensionControl, enable);
};

export const fetchCameraLightControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.CameraLightControl}`);
};

export const sendCameraLightControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.CameraLightControl, enable);
};

export const fetchMopTwistControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.MopTwistControl}`);
};

export const sendMopTwistControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.MopTwistControl, enable);
};

export const fetchMopExtensionFurnitureLegHandlingControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.MopExtensionFurnitureLegHandlingControl}`);
};

export const sendMopExtensionFurnitureLegHandlingControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.MopExtensionFurnitureLegHandlingControl, enable);
};

export const sendCarpetSensorMode = async (payload: CarpetSensorModePayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.CarpetSensorModeControl}`, payload, "Could not send carpet sensor mode");
};

export const fetchCarpetSensorMode = async (): Promise<CarpetSensorMode> => {
    return (await get<CarpetSensorModePayload>(`/robot/capabilities/${Capability.CarpetSensorModeControl}`)).mode;
};

export const fetchCarpetSensorModeProperties = async (): Promise<CarpetSensorModeControlProperties> => {
    return get<CarpetSensorModeControlProperties>(`/robot/capabilities/${Capability.CarpetSensorModeControl}/properties`);
};

export const sendAutoEmptyDockAutoEmptyInterval = async (payload: AutoEmptyDockAutoEmptyIntervalPayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyIntervalControl}`, payload, "Could not send auto empty dock auto empty interval");
};

export const fetchAutoEmptyDockAutoEmptyInterval = async (): Promise<AutoEmptyDockAutoEmptyInterval> => {
    return (await get<AutoEmptyDockAutoEmptyIntervalPayload>(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyIntervalControl}`)).interval;
};

export const fetchAutoEmptyDockAutoEmptyIntervalProperties = async (): Promise<AutoEmptyDockAutoEmptyIntervalProperties> => {
    return get<AutoEmptyDockAutoEmptyIntervalProperties>(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyIntervalControl}/properties`);
};

export const fetchObstacleImagesState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.ObstacleImages}`);
};

export const sendObstacleImagesState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.ObstacleImages, enable);
};

export const fetchObstacleImagesProperties = async (): Promise<ObstacleImagesProperties> => {
    return get<ObstacleImagesProperties>(`/robot/capabilities/${Capability.ObstacleImages}/properties`);
};

export const fetchDuststreamingProperties = async (): Promise<DuststreamingProperties> => {
    return get<DuststreamingProperties>(`/robot/capabilities/${Capability.Duststreaming}/properties`);
};

export const fetchDuststreamingConfiguration = async (): Promise<DuststreamingConfiguration> => {
    return get<DuststreamingConfiguration>("/valetudo/config/duststreaming");
};

export const sendDuststreamingConfiguration = async (configuration: DuststreamingConfiguration): Promise<void> => {
    return put("/valetudo/config/duststreaming", configuration, "Could not update dust streaming configuration");
};

export const sendMopDockMopWashTemperature = async (payload: MopDockMopWashTemperaturePayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.MopDockMopWashTemperatureControl}`, payload, "Could not send mop dock mop wash temperature");
};

export const fetchMopDockMopWashTemperature = async (): Promise<MopDockMopWashTemperature> => {
    return (await get<MopDockMopWashTemperaturePayload>(`/robot/capabilities/${Capability.MopDockMopWashTemperatureControl}`)).temperature;
};

export const fetchMopDockMopWashTemperatureProperties = async (): Promise<MopDockMopWashTemperatureProperties> => {
    return get<MopDockMopWashTemperatureProperties>(`/robot/capabilities/${Capability.MopDockMopWashTemperatureControl}/properties`);
};

export const fetchMopDockMopAutoDryingControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.MopDockMopAutoDryingControl}`);
};

export const sendMopDockMopAutoDryingControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.MopDockMopAutoDryingControl, enable);
};

export const fetchFloorMaterialDirectionAwareNavigationControlState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.FloorMaterialDirectionAwareNavigationControl}`);
};

export const sendFloorMaterialDirectionAwareNavigationControlState = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.FloorMaterialDirectionAwareNavigationControl, enable);
};

export const sendCleanRoute = async (payload: CleanRoutePayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.CleanRouteControl}`, payload, "Could not send clean route");
};

export const fetchCleanRoute = async (): Promise<CleanRoute> => {
    return (await get<CleanRoutePayload>(`/robot/capabilities/${Capability.CleanRouteControl}`)).route;
};

export const fetchCleanRouteControlProperties = async (): Promise<CleanRouteControlProperties> => {
    return get<CleanRouteControlProperties>(`/robot/capabilities/${Capability.CleanRouteControl}/properties`);
};

export const sendMopDockMopDryingTime = async (payload: MopDockMopDryingTimePayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.MopDockMopDryingTimeControl}`, payload, "Could not send mop dock mop drying time");
};

export const fetchMopDockMopDryingTime = async (): Promise<MopDockMopDryingDuration> => {
    return (await get<MopDockMopDryingTimePayload>(`/robot/capabilities/${Capability.MopDockMopDryingTimeControl}`)).duration;
};

export const fetchMopDockMopDryingTimeControlProperties = async (): Promise<MopDockMopDryingTimeControlProperties> => {
    return get<MopDockMopDryingTimeControlProperties>(`/robot/capabilities/${Capability.MopDockMopDryingTimeControl}/properties`);
};

export const sendAutoEmptyDockAutoEmptyDuration = async (payload: AutoEmptyDockAutoEmptyDurationPayload): Promise<void> => {
    return put(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyDurationControl}`, payload, "Could not send auto empty dock auto empty duration");
};

export const fetchAutoEmptyDockAutoEmptyDuration = async (): Promise<AutoEmptyDockAutoEmptyDuration> => {
    return (await get<AutoEmptyDockAutoEmptyDurationPayload>(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyDurationControl}`)).duration;
};

export const fetchAutoEmptyDockAutoEmptyDurationControlProperties = async (): Promise<AutoEmptyDockAutoEmptyDurationControlProperties> => {
    return get<AutoEmptyDockAutoEmptyDurationControlProperties>(`/robot/capabilities/${Capability.AutoEmptyDockAutoEmptyDurationControl}/properties`);
};
