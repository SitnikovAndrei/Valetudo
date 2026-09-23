<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from "vue";
import logo from "../../../frontend/src/assets/icons/valetudo_splash.svg?url";

const emit = defineEmits<{close: []}>();
const image = ref<HTMLImageElement>();
let frame = 0;
let previous = 0;
let x = 0;
let y = 0;
let dx = 0;
let dy = 0;

function bounds() {
    return {width: image.value?.offsetWidth ?? 120, height: image.value?.offsetHeight ?? 120};
}
function animate(now: number) {
    const elapsed = previous ? Math.min(100, now - previous) : 0;
    previous = now;
    const size = bounds();
    x += dx * elapsed;
    y += dy * elapsed;
    if (x <= 0 || x + size.width >= innerWidth) {dx *= -1; x = Math.max(0, Math.min(x, innerWidth - size.width));}
    if (y <= 0 || y + size.height >= innerHeight) {dy *= -1; y = Math.max(0, Math.min(y, innerHeight - size.height));}
    if (image.value) image.value.style.transform = `translate(${x}px, ${y}px)`;
    frame = requestAnimationFrame(animate);
}
function key(event: KeyboardEvent) {if (event.key === "Escape") emit("close");}
onMounted(() => {
    const size = bounds();
    x = Math.random() * Math.max(0, innerWidth - size.width);
    y = Math.random() * Math.max(0, innerHeight - size.height);
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.hypot(innerWidth, innerHeight) / 12000;
    dx = Math.cos(angle) * speed;
    dy = Math.sin(angle) * speed;
    window.addEventListener("keydown", key);
    frame = requestAnimationFrame(animate);
});
onBeforeUnmount(() => {cancelAnimationFrame(frame); window.removeEventListener("keydown", key);});
</script>

<template>
    <Teleport to="body"><div class="fixed inset-0 z-[1500] cursor-pointer overflow-hidden bg-black" role="dialog" aria-modal="true" aria-label="Valetudo bounce" @click="emit('close')"><img ref="image" :src="logo" alt="Valetudo" class="absolute left-0 top-0 w-[20vmin] min-w-[120px] max-w-[350px]" /></div></Teleport>
</template>
