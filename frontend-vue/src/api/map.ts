/* Map data and map-based actions: segments, zones, go-to, restrictions, annotations and map management. */
import {get, put, subscribeToSSE, sendToggleMutation} from "./http";
import type {RawMapData} from "./RawMapData";
import {
    Capability,
    type CombinedVirtualRestrictionsProperties,
    type CombinedVirtualRestrictionsUpdateRequestParameters,
    type MapAnnotationsProperties,
    type MapSegmentationActionRequestParameters,
    type MapSegmentationProperties,
    type MapSegmentEditJoinRequestParameters,
    type MapSegmentEditSplitRequestParameters,
    type MapSegmentMaterialControlProperties,
    type MapSegmentMaterialControlRequestParameters,
    type MapSegmentRenameRequestParameters,
    type Point,
    type Segment,
    type SimpleToggleState,
    type ValetudoMapAnnotation,
    type ZoneActionRequestParameters,
    type ZoneProperties,
} from "./types";
import {floorObject} from "./utils";
import {preprocessMap} from "./mapUtils";

export const fetchMap = (): Promise<RawMapData | null> => {
    return get<RawMapData | null>("/robot/state/map").then(data => data ? preprocessMap(data) : null);
};

export const subscribeToMap = (
    listener: (data: RawMapData | null) => void
): (() => void) => {
    return subscribeToSSE(
        "/robot/state/map/sse",
        "MapUpdated",
        (data: RawMapData | null) => {
            listener(data ? preprocessMap(data) : null);
        });
};

export const sendGoToCommand = async (point: Point): Promise<void> => {
    await put(`/robot/capabilities/${Capability.GoToLocation}`, {action: "goto", coordinates: floorObject(point)});
};

export const fetchZoneProperties = async (): Promise<ZoneProperties> => {
    return get<ZoneProperties>(`/robot/capabilities/${Capability.ZoneCleaning}/properties`);
};

export const sendCleanZonesCommand = async (
    parameters: ZoneActionRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.ZoneCleaning}`, {action: "clean", zones: parameters.zones.map(floorObject), iterations: parameters.iterations});
};

export const fetchSegments = async (): Promise<Segment[]> => {
    return get<Segment[]>(`/robot/capabilities/${Capability.MapSegmentation}`);
};

export const fetchMapSegmentationProperties = async (): Promise<MapSegmentationProperties> => {
    return get<MapSegmentationProperties>(`/robot/capabilities/${Capability.MapSegmentation}/properties`);
};

export const sendCleanSegmentsCommand = async (
    parameters: MapSegmentationActionRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapSegmentation}`, {action: "start_segment_action", segment_ids: parameters.segment_ids, iterations: parameters.iterations ?? 1, customOrder: parameters.customOrder ?? false});
};

export const sendJoinSegmentsCommand = async (
    parameters: MapSegmentEditJoinRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapSegmentEdit}`, {action: "join_segments", segment_a_id: parameters.segment_a_id, segment_b_id: parameters.segment_b_id});
};

export const sendSplitSegmentCommand = async (
    parameters: MapSegmentEditSplitRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapSegmentEdit}`, {action: "split_segment", segment_id: parameters.segment_id, pA: parameters.pA, pB: parameters.pB});
};

export const sendRenameSegmentCommand = async (
    parameters: MapSegmentRenameRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapSegmentRename}`, {action: "rename_segment", segment_id: parameters.segment_id, name: parameters.name});
};

export const sendSetSegmentMaterialCommand = async (parameters: MapSegmentMaterialControlRequestParameters): Promise<void> => {
    return put(`/robot/capabilities/${Capability.MapSegmentMaterialControl}`, {action: "set_material", segment_id: parameters.segment_id, material: parameters.material}, "Could not set segment material");
};

export const fetchMapSegmentMaterialControlProperties = async (): Promise<MapSegmentMaterialControlProperties> => {
    return get<MapSegmentMaterialControlProperties>(`/robot/capabilities/${Capability.MapSegmentMaterialControl}/properties`);
};

export const fetchPersistentMapState = async (): Promise<SimpleToggleState> => {
    return get<SimpleToggleState>(`/robot/capabilities/${Capability.PersistentMapControl}`);
};

export const sendPersistentMapEnabled = async (enable: boolean): Promise<void> => {
    await sendToggleMutation(Capability.PersistentMapControl, enable);
};

export const sendMapReset = async (): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapReset}`, {action: "reset"}, "Could not reset the map");
};

export const sendStartMappingPass = async (): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MappingPass}`, {action: "start_mapping"}, "Could not start the mapping pass");
};

export const fetchCombinedVirtualRestrictionsProperties = async (): Promise<CombinedVirtualRestrictionsProperties> => {
    return get<CombinedVirtualRestrictionsProperties>(`/robot/capabilities/${Capability.CombinedVirtualRestrictions}/properties`);
};

export const sendCombinedVirtualRestrictionsUpdate = async (
    parameters: CombinedVirtualRestrictionsUpdateRequestParameters
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.CombinedVirtualRestrictions}`, parameters);
};

export const fetchMapAnnotationsProperties = async (): Promise<MapAnnotationsProperties> => {
    return get<MapAnnotationsProperties>(`/robot/capabilities/${Capability.MapAnnotations}/properties`);
};

export const sendMapAnnotationsUpdate = async (
    mapAnnotations: Array<ValetudoMapAnnotation>
): Promise<void> => {
    await put(`/robot/capabilities/${Capability.MapAnnotations}`, mapAnnotations);
};
