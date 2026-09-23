<script setup lang="ts">
import {onBeforeUnmount, ref} from "vue";

defineProps<{facing?: "left" | "right"}>();
const active = ref(false);
let context: AudioContext | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

function peent() {
    active.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => active.value = false, 150);
    try {
        context ??= new AudioContext({latencyHint: "interactive"});
        if (context.state === "suspended") void context.resume();
        const start = context.currentTime;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(185, start);
        oscillator.frequency.linearRampToValueAtTime(174, start + 0.26);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.15, start + 0.04);
        envelope.gain.linearRampToValueAtTime(0, start + 0.28);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.28);
        oscillator.onended = () => {oscillator.disconnect(); envelope.disconnect();};
    } catch { /* Audio is optional when the browser does not support playback. */ }
}
onBeforeUnmount(() => {if (timer) clearTimeout(timer); void context?.close();});
</script>

<template>
    <button type="button" class="inline-block h-[2em] w-[3.65em] cursor-pointer align-middle transition-transform" :style="{transform: `${facing === 'left' ? 'scaleX(-1)' : ''} ${active ? 'scale(1.02) rotate(-1deg)' : ''}`}" :aria-label='$t("Woodcock, play peent")' @click="peent">
        <svg viewBox="0 0 135.09 74.134" class="h-full w-full overflow-visible" aria-hidden="true">
            <path d="m73.586 33.634 55 20q6 2 6 8t-6 4l-55-7q-15 15-35 15c-30 0-45-30-35-60 10-20 45-20 70 20z" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="14" />
            <path d="m73.586 33.634 55 20q6 2 6 8t-6 4l-55-7q-15 15-35 15c-30 0-45-30-35-60 10-20 45-20 70 20z" fill="#c19a6b" />
            <path d="m73.586 33.634 55 20q6 2 6 8t-6 4l-55-7z" fill="#e09e86" />
            <path d="m73.586 45.634 55 14q6 4 0 6l-55-7z" fill="#bf7e68" />
            <g transform="translate(-31.414 -46.366)" fill="none" stroke="#3e2723" stroke-linecap="round" stroke-width="5"><path d="m45 55q20-5 40 5" /><path d="m40 75q20-5 40 5" /><path d="m45 95q20-5 35 5" /></g>
            <ellipse transform="rotate(-20)" cx="18.347" cy="47.791" rx="10" ry="12" fill="#8b5a2b" opacity="0.2" />
            <g transform="translate(-31.414 -46.366)"><circle cx="85" cy="76" r="9" opacity="0.2" /><circle cx="85" cy="75" r="9" fill="#1a1a1a" /><circle cx="88" cy="72" r="3" fill="#fff" /></g>
        </svg>
    </button>
</template>
