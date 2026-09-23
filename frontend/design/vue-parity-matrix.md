# Vue parity matrix

This is the route and behavior inventory for the migration plan. Sources are `src/AppRouter.tsx`, the nested `*Router.tsx` files, `src/components/ValetudoAppBar.tsx`, and `src/api/client.ts`. The Vue workspace is experimental; a row is complete only after its API behavior, loading/error states, capability gates, and browser interaction have been checked. `frontend/design/functional-mapping.md` records which preview elements are only visual.

| Hash route | React owner | Gate / behavior to preserve | Vue status |
| --- | --- | --- | --- |
| `/` | `HomePage`, `LiveMapPage`, controls | Map SSE, status, battery, presets, Start/Resume/Pause/Stop/Home, segment/zone/point actions only with each capability | Implemented; fixture browser checked map, segment selection, coordinate point and zone API payloads, themes and responsive shell; live X40 Ultra Start and Stop through Vue returned the robot to docked state; remaining commands unverified |
| `/robot/consumables` | `Consumables` | `ConsumableMonitoring`; reset confirmation and mutation | Implemented; mutation unverified on device |
| `/robot/manual_control` | `ManualControl` | `ManualControl` or `HighResolutionManualControl`; input release and cleanup | D-pad, keyboard, high-resolution joystick and optional camera implemented; latency and release unverified on device |
| `/robot/total_statistics` | `TotalStatistics` | `TotalStatistics`; actual returned datapoints | Values and achievement overview implemented; fixture browser checked values and achievement dialog; device check pending |
| `/robot/camera` | `Duststream` | `Duststreaming` and enabled configuration; stream cleanup | Implemented; real stream unverified |
| `/options/map_management` | `MapManagement` | Any supported map management capability; reset/export confirmations | Implemented; destructive actions unverified on device |
| `/options/map_management/segments` | `EditMapPage` | `MapSegmentEdit`, `MapSegmentRename` or `MapSegmentMaterialControl` | Rename, material, join and split implemented; fixture browser checked rename, material, join and split payloads; live X40 Ultra accepted saving its existing material; live join/split pending because they alter the stored map |
| `/options/map_management/virtual_restrictions` | `EditMapPage` | `CombinedVirtualRestrictions` | Draw, drag existing, edit coordinates, remove, save and discard implemented; fixture browser checked drag and save payload; real robot verification pending |
| `/options/map_management/annotations` | `EditMapPage` | `MapAnnotations` | Draw, drag existing, edit coordinates, remove, save and discard implemented; fixture browser checked drag and save payload; real robot verification pending |
| `/options/map_management/robot_coverage` | `RobotCoverageMapPage` | Coverage data and map gestures | Implemented; fixture browser checked render |
| `/options/map_management/spectator` | `SpectatorMapPage` | `Duststreaming` and enabled configuration | Implemented; real stream unverified |
| `/options/connectivity` | `ConnectivityOptions` | Available connection settings | Implemented; fixture browser checked navigation |
| `/options/connectivity/auth` | `AuthSettingsPage` | HTTP Basic Auth read/save, credential handling | Implemented; backend integration unverified |
| `/options/connectivity/mqtt` | `MQTTConnectivityPage` | MQTT configuration and connection status | Implemented; live broker integration unverified |
| `/options/connectivity/networkadvertisement` | `NetworkAdvertisementSettingsPage` | Network advertisement configuration | Implemented; live network integration unverified |
| `/options/connectivity/ntp` | `NTPConnectivityPage` | NTP configuration and status | Implemented; live NTP integration unverified |
| `/options/connectivity/wifi` | `WifiConnectivityPage` | `WifiConfiguration`; provisioned reconfiguration rules | Implemented; physical reconnect unverified |
| `/options/robot` | `RobotOptions` | Per-control capability gates and robot property ranges | Toggles and six property-driven selectors implemented; fixture browser checked selection and payload; device verification pending |
| `/options/robot/system` | `SystemRobotOptions` | Available system controls | Speaker, DND and voice packs implemented; device verification pending |
| `/options/robot/quirks` | `Quirks` | `Quirks`; dynamic values and save | Implemented; device verification pending |
| `/options/valetudo` | `ValetudoOptions` | App settings and destructive confirmations | Implemented; backend integration unverified |
| `/options/valetudo/analytics` | `Analytics` | Static explanatory content | Implemented; copy/visual review pending |
| `/valetudo/timers` | `Timers` | Create/edit/execute/delete, constraints and confirmations | Implemented; fixture browser checked create, edit, execute and delete API flow; real backend pending |
| `/valetudo/log` | `Log` | Log SSE, level change, unsubscribe | Implemented; live log SSE unverified |
| `/valetudo/updater` | `Updater` | Update state and confirmation | Implemented; update sequence unverified |
| `/valetudo/system_information` | `SystemInformation` | Host/runtime data | Implemented; fixture browser checked render |
| `/valetudo/ai` | `ValetudoAI` | Existing Eliza chat and easter eggs | Chat, `movienight` bounce and clickable woodcock implemented and fixture browser checked; `aprilfools` command, activation, invalid/valid license keys, cloud timeout, keygen assets and map watermark implemented; fixture and live browser interaction checked for the activation path |
| `/valetudo/help` | `Help` | Existing help content | Implemented; fixture browser checked |
| `/valetudo/about` | `About` | Version and links | Implemented; fixture browser checked |

Additional global behavior: events and interactions in the app bar, welcome dialog and dismissal, `palette-mode`, commit-ID reload, and the external Docs/GitHub/Swagger/Donate links. Embedded devices with `WifiConfiguration` enter provisioning when Wi-Fi is not connected. The Vue workspace currently implements this entry check and the Wi-Fi submission form at `/#/setup`; network scan and submission still require a device test.

## Acceptance profiles

| Profile | Required check |
| --- | --- |
| Minimal robot | Unsupported controls and menu entries remain hidden; basic commands follow robot state. |
| Segments, zones and point | Selection uses actual map IDs and coordinates; iteration limits come from properties. |
| Mop and dock | Each water, operation mode and dock control is gated independently. |
| Camera and spectator | Disabled configuration hides navigation; streams close on leave. |
| Embedded Wi-Fi | Disconnected state enters setup; scan, credentials, reconnect and direct hash refresh work. |
| Offline/error | Failed capabilities/API queries show retry; no stale success state. |

The Vue home, statistics, map restriction editor, robot selectors, timer flow, both theme choices, and embedded provisioning scan/submit flow were checked in a browser against the fixture API. The React and Vue home were visually compared on a live X40 Ultra at desktop and 390 px mobile sizes in light and dark modes; a Vue mobile horizontal overflow defect was fixed. The Vue layout follows the planned new design, so the mobile map begins below the identity cards whereas React places it immediately under the app bar. This is a visual difference to assess in final acceptance. Live API and Vue browser checks confirmed capabilities, map, status, segment material save, Wi-Fi connected state, and HTTP 200 SSE subscriptions. Vue Start changed the live status to `cleaning`; Vue Stop returned it to `docked`. The test exposed a hidden mobile Stop control, which was fixed and retested. A temporary copy of the Vue production build was served by the local mock backend on port 8080; the home and a refreshed direct hash URL loaded successfully. The React production build was then restored. Camera streaming is disabled on the live robot. Other screens still need the four-combination visual comparison; durable browser E2E, manual movement/release, camera/spectator, Wi-Fi reprovisioning, firmware update and destructive map/configuration actions remain pending. Until these checks are complete, `frontend/build` continues to come from the React workspace.
