<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import {Capability, type ManualControlCommand, type ValetudoManualMovementVector} from "../api/types";
import {fetchDuststreamingConfiguration, fetchDuststreamingProperties, fetchHighResolutionManualControlState, fetchManualControlProperties, fetchManualControlState, sendHighResolutionManualControlInteraction, sendManualControlInteraction} from "../api/client";
import DuststreamCanvas from "../components/DuststreamCanvas.vue";

const props = defineProps<{capabilities: Capability[]}>();
const highRes = computed(() => props.capabilities.includes(Capability.HighResolutionManualControl));
const supported = computed(() => highRes.value || props.capabilities.includes(Capability.ManualControl));
const queryClient = useQueryClient();
const state = useQuery({queryKey: ["manualControl", highRes], queryFn: () => highRes.value ? fetchHighResolutionManualControlState() : fetchManualControlState(), enabled: supported});
const properties = useQuery({queryKey: ["manualControlProperties"], queryFn: fetchManualControlProperties, enabled: computed(() => supported.value && !highRes.value)});
const cameraSupported = computed(() => props.capabilities.includes(Capability.Duststreaming));
const cameraConfiguration = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: cameraSupported});
const cameraProperties = useQuery({queryKey: ["duststreamProperties"], queryFn: fetchDuststreamingProperties, enabled: computed(() => cameraConfiguration.data.value?.enabled === true)});
const toggle = useMutation({mutationFn: async (enabled: boolean) => highRes.value ? sendHighResolutionManualControlInteraction({action: enabled ? "enable" : "disable"}) : sendManualControlInteraction({action: enabled ? "enable" : "disable"}), onSuccess: () => queryClient.invalidateQueries({queryKey: ["manualControl"]})});
const sendError = ref(false);
const vector = ref<ValetudoManualMovementVector>({velocity: 0, angle: 0});
const joystick = ref<HTMLElement>();
const joystickPosition = ref({x: 0, y: 0});
let joystickPointer: number | undefined;
const heldKeys = new Set<string>();
let interval: ReturnType<typeof setInterval> | undefined;
let busy = false;
let pending: ValetudoManualMovementVector | undefined;

function command(value: ValetudoManualMovementVector): ManualControlCommand | undefined {
    if (value.velocity > 0.3) return "forward";
    if (value.velocity < -0.3) return "backward";
    if (value.angle > 30) return "rotate_clockwise";
    if (value.angle < -30) return "rotate_counterclockwise";
    return undefined;
}

async function dispatch(value: ValetudoManualMovementVector) {
    try {
        if (highRes.value) await sendHighResolutionManualControlInteraction({action: "move", vector: value});
        else {
            const movementCommand = command(value);
            if (movementCommand && properties.data.value?.supportedMovementCommands.includes(movementCommand)) await sendManualControlInteraction({action: "move", movementCommand});
        }
        sendError.value = false;
    } catch {sendError.value = true;}
}

function enqueue(value: ValetudoManualMovementVector) {
    if (busy) {pending = value; return;}
    busy = true;
    void dispatch(value).finally(() => {
        busy = false;
        if (pending) {const next = pending; pending = undefined; enqueue(next);}
    });
}

function release() {
    if (interval) {clearInterval(interval); interval = undefined;}
    joystickPointer = undefined;
    joystickPosition.value = {x: 0, y: 0};
    const wasActive = vector.value.velocity !== 0 || vector.value.angle !== 0;
    vector.value = {velocity: 0, angle: 0};
    heldKeys.clear();
    if (wasActive && highRes.value && state.data.value?.enabled) enqueue(vector.value);
}

function press(value: ValetudoManualMovementVector) {
    if (!state.data.value?.enabled || !supported.value) return;
    if (interval) clearInterval(interval);
    vector.value = value;
    enqueue(value);
    interval = setInterval(() => enqueue(vector.value), 250);
}

function moveJoystick(event: PointerEvent) {
    if (joystickPointer !== event.pointerId || !joystick.value || !state.data.value?.enabled) return;
    const rect = joystick.value.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = (event.clientX - rect.left - rect.width / 2) / radius;
    const dy = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.max(1, Math.hypot(dx, dy));
    joystickPosition.value = {x: dx / length, y: dy / length};
    vector.value = {velocity: -joystickPosition.value.y, angle: joystickPosition.value.x * 120};
    if (!interval) {enqueue(vector.value); interval = setInterval(() => enqueue(vector.value), 250);}
}

function startJoystick(event: PointerEvent) {
    if (!highRes.value || !state.data.value?.enabled) return;
    joystickPointer = event.pointerId;
    joystick.value?.setPointerCapture(event.pointerId);
    moveJoystick(event);
}

function stopJoystick(event: PointerEvent) {
    if (joystickPointer !== event.pointerId) return;
    joystickPointer = undefined;
    joystickPosition.value = {x: 0, y: 0};
    release();
}

const buttons = [
    {label: "Forward", value: {velocity: 1, angle: 0}, key: "w", command: "forward"},
    {label: "Left", value: {velocity: 0, angle: -120}, key: "a", command: "rotate_counterclockwise"},
    {label: "Right", value: {velocity: 0, angle: 120}, key: "d", command: "rotate_clockwise"},
    {label: "Backward", value: {velocity: -1, angle: 0}, key: "s", command: "backward"}
] as const;
function allowed(direction: typeof buttons[number]) {return highRes.value || properties.data.value?.supportedMovementCommands.includes(direction.command) === true;}
function key(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    const keyName = ({arrowup: "w", arrowleft: "a", arrowright: "d", arrowdown: "s"} as Record<string, string>)[event.key.toLowerCase()] ?? event.key.toLowerCase();
    const direction = buttons.find(button => button.key === keyName);
    if (!direction || !allowed(direction) || !state.data.value?.enabled) return;
    event.preventDefault();
    if (event.type === "keydown") {
        heldKeys.add(keyName);
        if (!event.repeat) press(direction.value);
    } else {
        heldKeys.delete(keyName);
        const remaining = buttons.find(button => heldKeys.has(button.key));
        if (remaining) press(remaining.value);
        else release();
    }
}
function visibility() {if (document.hidden) release();}
onMounted(() => {window.addEventListener("keydown", key); window.addEventListener("keyup", key); window.addEventListener("blur", release); document.addEventListener("visibilitychange", visibility);});
onBeforeUnmount(() => {release(); window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", visibility);});
watch(() => state.data.value?.enabled, enabled => {if (!enabled) release();});
</script>

<template>
    <section class="panel max-w-2xl">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Manual control") }}</h1>
        <Message v-if="!supported" severity="warn">{{ $t("Manual control is unavailable on this robot.") }}</Message>
        <p v-else-if="state.isPending.value || properties.isPending.value && !highRes" role="status">{{ $t("Loading controls…") }}</p>
        <Message v-else-if="state.isError.value || properties.isError.value && !highRes" severity="error">{{ $t("Manual controls unavailable.") }}</Message>
        <template v-else>
            <div v-if="cameraConfiguration.data.value?.enabled && cameraProperties.data.value" class="mx-auto mb-6 max-w-xl overflow-hidden rounded-xl" :style="{aspectRatio: `${cameraProperties.data.value.width} / ${cameraProperties.data.value.height}`}" style="background: var(--app-bg)"><DuststreamCanvas v-if="cameraProperties.data.value.duststreamerInstalled" :width="cameraProperties.data.value.width" :height="cameraProperties.data.value.height" /><p v-else class="muted p-4">{{ $t("Camera streamer is unavailable.") }}</p></div>
            <label class="mb-6 flex items-center gap-2"><Checkbox :model-value="state.data.value?.enabled ?? false" binary :disabled="toggle.isPending.value" @update:model-value="toggle.mutate(Boolean($event))" /> {{ $t("Enable manual control") }}</label>
            <p class="muted mb-5 text-sm">{{ $t("Use the joystick, hold a direction button or use the arrow keys / W A S D. Releasing stops sending movement.") }}</p>
            <div v-if="highRes" ref="joystick" class="relative mx-auto mb-6 h-48 w-48 rounded-full border-4 touch-none select-none" :class="state.data.value?.enabled ? 'cursor-crosshair' : 'opacity-50'" style="background: var(--app-bg); border-color: var(--app-border)" role="group" :aria-label='$t("Movement joystick")' @pointerdown.prevent="startJoystick" @pointermove.prevent="moveJoystick" @pointerup="stopJoystick" @pointercancel="stopJoystick"><div class="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full shadow" :style="{background: 'var(--app-accent)', transform: `translate(calc(-50% + ${joystickPosition.x * 64}px), calc(-50% + ${joystickPosition.y * 64}px))`}" /></div>
            <div class="mx-auto grid max-w-xs grid-cols-3 gap-3" style="touch-action: none">
                <Button v-for="direction in buttons" :key="direction.key" :label="$t(direction.label)" outlined :class="direction.key === 'w' ? 'col-start-2' : direction.key === 's' ? 'col-start-2 row-start-3' : direction.key === 'a' ? 'col-start-1 row-start-2' : 'col-start-3 row-start-2'" :disabled="!state.data.value?.enabled || !allowed(direction)" @pointerdown.prevent="press(direction.value)" @pointerup="release" @pointercancel="release" @pointerleave="release" />
            </div>
        </template>
        <Message v-if="toggle.isError.value || sendError" severity="error" class="mt-5">{{ $t("Manual control request failed.") }}</Message>
    </section>
</template>
