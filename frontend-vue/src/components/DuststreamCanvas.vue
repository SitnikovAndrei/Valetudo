<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import {CRTCompositor, FetchSource, Player} from "jsmpeg";
import {Capability} from "../api/types";
import {valetudoAPIBaseURL} from "../api/client";

const props = defineProps<{width: number; height: number}>();
const canvas = ref<HTMLCanvasElement>();
let player: Player | undefined;
function start() {
    if (!canvas.value) return;
    player?.destroy();
    player = new Player(`${valetudoAPIBaseURL}/robot/capabilities/${Capability.Duststreaming}/stream`, {
        source: FetchSource,
        canvas: canvas.value,
        autoplay: true,
        reconnectInterval: 3,
        decodeFirstFrame: false,
        videoWidth: props.width,
        videoHeight: props.height,
        createRenderer: options => new CRTCompositor(options, {label: "VALETUDO"})
    });
}
onMounted(start);
watch(() => [props.width, props.height], start);
onBeforeUnmount(() => {try {player?.destroy();} catch { /* renderer already stopped */ }});
</script>

<template><canvas ref="canvas" class="block h-full w-full object-contain" :width="width" :height="height" /></template>
