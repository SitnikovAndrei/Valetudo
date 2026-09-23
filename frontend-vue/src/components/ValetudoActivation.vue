<script setup lang="ts">
import {onBeforeUnmount, ref, watch} from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import {activate, activated} from "../aprilFools";
import {XmPlayer} from "../../../frontend/src/util/XmPlayer";
import musicUrl from "../../../frontend/src/assets/raw/keygen.xm.gz?url";
import robotUrl from "../../../frontend/src/assets/raw/robot.json.gz?url";

type Mesh = {v: number[]; e: number[]};
const keys = new Set(["00000-00000-00000-00000-00000", "FCKGW-RHQQ2-YXRKT-8TG6W-2B7Q8", "J3QQ4-H7H2V-2HCH4-M3HK8-6M8VW"]);
const open = ref(false);
const key = ref("");
const invalid = ref(false);
const cloud = ref<"idle" | "connecting" | "failed">("idle");
const loading = ref(false);
const assetError = ref(false);
const keygen = ref(false);
const cracked = ref(false);
const muted = ref(false);
const canvas = ref<HTMLCanvasElement>();
let mesh: Mesh | undefined;
let music: ArrayBuffer | undefined;
let player: XmPlayer | undefined;
let frame = 0;
let timer = 0;
let cloudTimer = 0;
let started = 0;
let replay = false;

async function decompress(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load activation assets");
    const data = await response.arrayBuffer();
    const header = new Uint8Array(data, 0, Math.min(2, data.byteLength));
    if (header[0] !== 0x1f || header[1] !== 0x8b) return data;
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

async function loadAssets() {
    if (mesh && music) return;
    loading.value = true;
    assetError.value = false;
    try {
        const [audio, geometry] = await Promise.all([decompress(musicUrl), decompress(robotUrl)]);
        music = audio;
        mesh = JSON.parse(new TextDecoder().decode(geometry)) as Mesh;
    } catch {
        assetError.value = true;
        throw new Error("Unable to load activation assets");
    } finally {
        loading.value = false;
    }
}

function close() {
    open.value = false;
    key.value = "";
    invalid.value = false;
    cloud.value = "idle";
    window.clearTimeout(cloudTimer);
}

function manualActivate() {
    if (keys.has(key.value.trim().toUpperCase())) {activate(); close();}
    else invalid.value = true;
}

async function cloudActivate() {
    cloud.value = "connecting";
    try {await loadAssets();} catch { /* The simulated timeout still shows the phone activation path. */ }
    cloudTimer = window.setTimeout(() => cloud.value = "failed", 2500);
}

async function showKeygen(isReplay: boolean) {
    try {await loadAssets();} catch {return;}
    replay = isReplay;
    cracked.value = isReplay;
    keygen.value = true;
    close();
    started = performance.now();
    player = new XmPlayer();
    try {if (music && await player.load(music) && !muted.value) player.play();} catch { /* Audio may be unavailable in this browser. */ }
    frame = requestAnimationFrame(draw);
    if (!isReplay) timer = window.setTimeout(() => cracked.value = true, 13700);
}

function draw(now: number) {
    const element = canvas.value;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || !mesh) return;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (element.width !== width || element.height !== height) {element.width = width; element.height = height;}
    const time = (now - started) / 1000;
    ctx.fillStyle = "#08070f";
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 150; i++) {
        const x = ((i * 137.5 + time * (20 + i % 7)) % (width + 20)) - 10;
        const y = (i * 83.3) % height;
        ctx.fillStyle = i % 3 ? "#a7f3d0" : "#ffffff";
        ctx.fillRect(x, y, 1 + i % 2, 1 + i % 2);
    }
    const size = Math.min(width, height) * 0.34;
    const points: {x: number; y: number}[] = [];
    for (let index = 0; index < mesh.v.length; index += 3) {
        const [x, y, z] = mesh.v.slice(index, index + 3);
        const angle = time * 1.2;
        const rx = x * Math.cos(angle) - z * Math.sin(angle);
        const rz = z * Math.cos(angle) + x * Math.sin(angle);
        const perspective = 1 / Math.max(0.1, 3.5 - rz);
        points.push({x: width / 2 + rx * perspective * size, y: height / 2 + y * perspective * size});
    }
    ctx.strokeStyle = `hsl(${(time * 60) % 360}, 100%, 60%)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let index = 0; index < mesh.e.length; index += 2) {
        const a = points[mesh.e[index]];
        const b = points[mesh.e[index + 1]];
        if (a && b) {ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);}
    }
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#66ffd1";
    ctx.font = `bold ${Math.min(64, Math.max(28, width / 10))}px monospace`;
    ctx.fillText("VALETUDO", width / 2, Math.max(75, height * 0.16));
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = cracked.value ? "#00ff66" : "#ffffff";
    ctx.fillText(cracked.value ? ">>> LICENSE PATCHED <<<" : "GENERATING LICENSE KEY...", width / 2, height - 130);
    if (!cracked.value) {
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(width * 0.2, height - 110, width * 0.6, 14);
        ctx.fillStyle = "#ffc940";
        ctx.fillRect(width * 0.2 + 2, height - 108, (width * 0.6 - 4) * Math.min(1, (now - started) / 13700), 10);
    }
    frame = requestAnimationFrame(draw);
}

function exitKeygen() {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    player?.stop();
    player = undefined;
    keygen.value = false;
    activate();
}

watch(muted, value => {if (value) player?.stop(); else player?.play();});
onBeforeUnmount(() => {window.clearTimeout(timer); window.clearTimeout(cloudTimer); cancelAnimationFrame(frame); player?.stop();});
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style="border-color: var(--app-border)">
        <div><h2 class="font-semibold">Valetudo Activation</h2><p class="muted text-sm">{{ activated ? 'Activated with a digital license' : 'Valetudo is not activated' }}</p></div>
        <Button :label="activated ? 'Details' : 'Activate'" outlined @click="open = true" />
    </div>
    <Dialog v-model:visible="open" modal :header="activated ? 'Valetudo Genuine Advantage' : 'Activation Required'" class="w-full max-w-lg" @hide="close">
        <template v-if="activated">
            <p class="font-semibold">Licensed Product</p><p class="muted mt-2">Valetudo is activated with a digital license.</p>
            <div class="panel mt-4 font-mono text-sm"><p>LICENSE TYPE: Unlimited Company License</p><p>REGISTERED TO: Hackerman</p></div>
            <div class="mt-5 flex justify-end gap-2"><Button label="Close" text @click="close" /><Button label="View Keygen again" :loading="loading" @click="showKeygen(true)" /></div>
        </template>
        <template v-else>
            <p>Your Evaluation License for Valetudo has expired.</p><p class="muted mt-2">Continued use of this software requires a valid Valetudo subscription.</p>
            <div class="panel mt-4"><p class="font-mono font-bold">&gt; Cloud Activation</p><p class="muted mt-2 text-sm">Automatically fetch a license from the Valetudo Licensing Server.</p>
                <Button v-if="cloud === 'idle'" label="Activate Valetudo now" class="mt-3" @click="cloudActivate" />
                <p v-else-if="cloud === 'connecting'" role="status" class="mt-3">Handshaking with licensing.valetudo.cloud...</p>
                <div v-else class="mt-3"><Message severity="error">CONNECTION TIMED OUT (Error 000)</Message><Button label="Activate by Phone" outlined :loading="loading" @click="showKeygen(false)" /></div>
            </div>
            <Message v-if="assetError" severity="error" class="mt-3">Activation assets could not be loaded. Retry the phone activation.</Message>
            <label class="mt-4 flex flex-col gap-2">Enter License Key<InputText v-model="key" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" class="w-full font-mono" @input="invalid = false" /></label>
            <Message v-if="invalid" severity="error" class="mt-2">Invalid checksum or revoked key.</Message>
            <div class="mt-5 flex justify-end gap-2"><Button label="Cancel" text @click="close" /><Button label="Activate" :disabled="key.length < 5" @click="manualActivate" /></div>
        </template>
    </Dialog>
    <div v-if="keygen" class="fixed inset-0 z-[9999] bg-black" role="dialog" aria-modal="true" aria-label="Valetudo keygen">
        <canvas ref="canvas" class="h-full w-full" aria-hidden="true" />
        <div class="absolute bottom-5 right-5 flex gap-2"><Button :label="muted ? 'Unmute' : 'Mute'" @click="muted = !muted" /><Button v-if="cracked || replay" label="Exit" @click="exitKeygen" /></div>
    </div>
</template>
