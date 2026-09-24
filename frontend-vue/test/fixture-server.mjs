import http from "node:http";
import fs from "node:fs";

const fixtureMap = JSON.parse(fs.readFileSync(new URL("../../backend/test/lib/robots/dreame/res/map/d9_1058_with_segments.json", import.meta.url)));
fixtureMap.metaData.nonce = "fixture-map-1";

const status = {
    __class: "StatusStateAttribute",
    metaData: {},
    value: "idle",
    flag: "none"
};
const embedded = process.env.FIXTURE_EMBEDDED === "1";
const rich = process.env.FIXTURE_RICH === "1";
const noMap = process.env.FIXTURE_NO_MAP === "1";
const basicOnly = process.env.FIXTURE_BASIC_ONLY === "1";
if (rich) status.value = "docked";

const responses = new Map([
    ["/api/v2/robot/capabilities", ["BasicControlCapability", "TotalStatisticsCapability", ...(basicOnly ? [] : ["MapSegmentationCapability", "ZoneCleaningCapability", "GoToLocationCapability"]), ...(embedded ? ["WifiConfigurationCapability", "WifiScanCapability"] : []), ...(rich ? ["FanSpeedControlCapability", "WaterUsageControlCapability", "OperationModeControlCapability", "DoNotDisturbCapability", "CarpetSensorModeControlCapability", "CleanRouteControlCapability", "AutoEmptyDockAutoEmptyIntervalControlCapability", "AutoEmptyDockAutoEmptyDurationControlCapability", "MopDockMopWashTemperatureControlCapability", "MopDockMopDryingTimeControlCapability", "CombinedVirtualRestrictionsCapability", "MapAnnotationsCapability", "MapSegmentEditCapability", "MapSegmentRenameCapability", "MapSegmentMaterialControlCapability"] : [])]],
    ["/api/v2/valetudo", {embedded, systemId: "Fixture Robot", welcomeDialogDismissed: true}],
    ["/api/v2/robot", {manufacturer: "Test", modelName: "Fixture Vacuum", modelDetails: {supportedAttachments: [], supportedDockComponents: []}, implementation: "fixture"}],
    ["/api/v2/robot/state/attributes", [status, {__class: "BatteryStateAttribute", metaData: {}, level: 87, flag: "charging"}]],
    ["/api/v2/robot/state/map", noMap ? null : fixtureMap],
    ["/api/v2/robot/capabilities/MapSegmentationCapability/properties", {iterationCount: {min: 1, max: 3}, customOrderSupport: true}],
    ["/api/v2/robot/capabilities/ZoneCleaningCapability/properties", {zoneCount: {min: 1, max: 3}, iterationCount: {min: 1, max: 3}}],
    ["/api/v2/robot/capabilities/TotalStatisticsCapability", [{type: "count", value: 12, timestamp: "2026-01-01T00:00:00Z"}]],
    ["/api/v2/robot/capabilities/WifiConfigurationCapability", {state: "not_connected", details: {}}],
    ["/api/v2/robot/capabilities/WifiScanCapability", [{bssid: "00:00:00:00:00:01", details: {ssid: "Fixture Wi-Fi", signal: -55}}]]
]);
const actions = [];
const timers = {};
let nextTimerId = 1;

if (rich) {
    responses.get("/api/v2/robot/capabilities").push("CurrentStatisticsCapability");
    responses.set("/api/v2/robot/capabilities/TotalStatisticsCapability", [
        {type: "time", value: 7350, timestamp: "2026-01-01T00:00:00Z"},
        {type: "area", value: 345000, timestamp: "2026-01-01T00:00:00Z"},
        {type: "count", value: 12, timestamp: "2026-01-01T00:00:00Z"}
    ]);
    responses.set("/api/v2/robot/capabilities/CurrentStatisticsCapability", [
        {type: "time", value: 0, timestamp: "2026-01-01T00:00:00Z"},
        {type: "area", value: 0, timestamp: "2026-01-01T00:00:00Z"}
    ]);
    responses.get("/api/v2/robot/state/attributes").push(
        {__class: "PresetSelectionStateAttribute", metaData: {}, type: "fan_speed", value: "balanced"},
        {__class: "PresetSelectionStateAttribute", metaData: {}, type: "water_grade", value: "medium"},
        {__class: "PresetSelectionStateAttribute", metaData: {}, type: "operation_mode", value: "vacuum"}
    );
    responses.set("/api/v2/robot/capabilities/FanSpeedControlCapability/presets", ["quiet", "balanced", "turbo"]);
    responses.set("/api/v2/robot/capabilities/WaterUsageControlCapability/presets", ["low", "medium", "high"]);
    responses.set("/api/v2/robot/capabilities/OperationModeControlCapability/presets", ["vacuum", "mop", "vacuum_and_mop"]);
    responses.set("/api/v2/robot/capabilities/DoNotDisturbCapability", {enabled: false, start: {hour: 22, minute: 0}, end: {hour: 8, minute: 0}});
    responses.set("/api/v2/timers/properties", {supportedActions: ["full_cleanup", "segment_cleanup"], supportedPreActions: []});
    responses.set("/api/v2/timers", timers);
    for (const [capability, field, initial, supportedField, supported] of [
        ["CarpetSensorModeControlCapability", "mode", "avoid", "supportedModes", ["off", "avoid", "lift"]],
        ["CleanRouteControlCapability", "route", "normal", "supportedRoutes", ["quick", "normal", "intensive"]],
        ["AutoEmptyDockAutoEmptyIntervalControlCapability", "interval", "normal", "supportedIntervals", ["off", "normal", "frequent"]],
        ["AutoEmptyDockAutoEmptyDurationControlCapability", "duration", "auto", "supportedDurations", ["auto", "short", "long"]],
        ["MopDockMopWashTemperatureControlCapability", "temperature", "warm", "supportedTemperatures", ["cold", "warm", "hot"]],
        ["MopDockMopDryingTimeControlCapability", "duration", "2h", "supportedDurations", ["2h", "3h", "4h"]]
    ]) {
        const path = `/api/v2/robot/capabilities/${capability}`;
        responses.set(path, {[field]: initial});
        responses.set(`${path}/properties`, {[supportedField]: supported, ...(capability === "CleanRouteControlCapability" ? {mopOnly: [], oneTime: []} : {})});
    }
    responses.set("/api/v2/robot/capabilities/CombinedVirtualRestrictionsCapability/properties", {supportedRestrictedZoneTypes: ["regular", "mop"]});
    responses.set("/api/v2/robot/capabilities/MapAnnotationsCapability/properties", {supportedAnnotationTypes: ["threshold", "curtain", "ramp"]});
    responses.set("/api/v2/robot/capabilities/MapSegmentMaterialControlCapability/properties", {supportedMaterials: ["generic", "tile", "wood_vertical", "carpet"]});
}

http.createServer((request, response) => {
    if (request.url === "/__fixture/actions") {
        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify(actions));
        return;
    }
    if (request.url === "/api/v2/robot/state/attributes/sse") {
        response.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache"});
        response.write(`event: StateAttributesUpdated\ndata: ${JSON.stringify(responses.get("/api/v2/robot/state/attributes"))}\n\n`);
        return;
    }
    if (request.url === "/api/v2/robot/state/map/sse") {
        response.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache"});
        response.write(`event: MapUpdated\ndata: ${JSON.stringify(noMap ? null : fixtureMap)}\n\n`);
        return;
    }

    if (rich && request.url?.startsWith("/api/v2/timers") && !["/api/v2/timers", "/api/v2/timers/properties"].includes(request.url)) {
        const [, , , , id, action] = request.url.split("/");
        if (!timers[id]) {
            response.writeHead(404);
            response.end();
            return;
        }
        if (request.method === "DELETE") {
            actions.push({path: request.url, method: "DELETE"});
            delete timers[id];
            response.writeHead(200);
            response.end();
            return;
        }
        if (request.method === "PUT" && action === "action") {
            actions.push({path: request.url, method: "PUT"});
            response.writeHead(200);
            response.end();
            return;
        }
    }

    if (rich && ["POST", "PUT"].includes(request.method) && request.url?.startsWith("/api/v2/timers")) {
        let input = "";
        request.on("data", chunk => input += chunk);
        request.on("end", () => {
            const timer = JSON.parse(input);
            const id = request.method === "POST" ? `fixture-${nextTimerId++}` : request.url.split("/").at(-1);
            timers[id] = {...timer, id};
            actions.push({path: request.url, method: request.method, payload: timer});
            response.writeHead(200);
            response.end();
        });
        return;
    }

    if (request.method === "PUT" && request.url === "/api/v2/robot/capabilities/WifiConfigurationCapability") {
        response.writeHead(200);
        response.end();
        return;
    }

    if (rich && request.method === "PUT" && /\/api\/v2\/robot\/capabilities\/(FanSpeedControl|WaterUsageControl|OperationModeControl)Capability\/preset/.test(request.url ?? "")) {
        let input = "";
        request.on("data", chunk => input += chunk);
        request.on("end", () => {
            const payload = JSON.parse(input);
            actions.push({path: request.url, payload});
            const type = request.url.includes("FanSpeed") ? "fan_speed" : request.url.includes("WaterUsage") ? "water_grade" : "operation_mode";
            const attribute = responses.get("/api/v2/robot/state/attributes").find(value => value.type === type);
            attribute.value = payload.name;
            response.writeHead(200);
            response.end();
        });
        return;
    }

    if (rich && request.method === "PUT" && (responses.has(request.url) || ["BasicControlCapability", "MapSegmentationCapability", "ZoneCleaningCapability", "GoToLocationCapability", "CombinedVirtualRestrictionsCapability", "MapAnnotationsCapability", "MapSegmentEditCapability", "MapSegmentRenameCapability", "MapSegmentMaterialControlCapability"].some(capability => request.url === `/api/v2/robot/capabilities/${capability}`))) {
        let input = "";
        request.on("data", chunk => input += chunk);
        request.on("end", () => {
            try {
                const payload = JSON.parse(input);
                actions.push({path: request.url, payload});
                if (responses.has(request.url)) responses.set(request.url, payload);
            } catch { /* Commands without a JSON body still succeed. */ }
            response.writeHead(200);
            response.end();
        });
        return;
    }

    const body = responses.get(request.url);
    if (body === undefined) {
        response.writeHead(404);
        response.end("Not found");
        return;
    }

    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify(body));
}).listen(8082, "127.0.0.1", () => {
    process.stdout.write("Fixture API listening on 127.0.0.1:8082\n");
});
