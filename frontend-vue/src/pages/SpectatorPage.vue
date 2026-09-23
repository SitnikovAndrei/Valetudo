<script setup lang="ts">
import {computed, ref} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability} from "../../../frontend/src/api/types";
import {fetchDuststreamingConfiguration, fetchDuststreamingProperties} from "../../../frontend/src/api/client";
import {useRobotMap} from "../composables/useRobotMap";
import MapCanvas from "../components/MapCanvas.vue";
import DuststreamCanvas from "../components/DuststreamCanvas.vue";

const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const map = useRobotMap();
const configuration = useQuery({queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
const properties = useQuery({queryKey: ["duststreamProperties"], queryFn: fetchDuststreamingProperties, enabled: computed(() => props.capabilities.includes(Capability.Duststreaming))});
const cameraSizes = ["small", "medium", "large", "xlarge", "fullscreen"] as const;
const size = ref<typeof cameraSizes[number]>("small");
function cycle() {size.value = cameraSizes[(cameraSizes.indexOf(size.value) + 1) % cameraSizes.length];}
function closeFullscreen(event: KeyboardEvent) {if (event.key === "Escape") size.value = "small";}
window.addEventListener("keydown", closeFullscreen);
import {onBeforeUnmount} from "vue";
onBeforeUnmount(() => window.removeEventListener("keydown", closeFullscreen));
</script>

<template>
    <section class="panel">
        <h1 class="mb-4 text-2xl font-bold">{{ $t("Spectator map") }}</h1>
        <p v-if="map.isPending.value" role="status">{{ $t("Loading map…") }}</p>
        <Message v-else-if="map.isError.value" severity="error">{{ $t("Unable to load map.") }} <Button :label='$t("Retry")' text @click="map.refetch()" /></Message>
        <div v-else-if="map.data.value" class="relative h-[min(70vh,700px)] overflow-hidden rounded-xl" style="background: var(--app-bg)">
            <MapCanvas :map="map.data.value" :palette-mode="paletteMode" mode="pan" :selected-segment-ids="[]" :zones="[]" />
            <button v-if="capabilities.includes(Capability.Duststreaming) && configuration.data.value?.enabled && properties.data.value?.duststreamerInstalled" type="button" class="absolute bottom-4 right-4 z-10 overflow-hidden rounded-lg bg-black" :class="size === 'fullscreen' ? 'fixed inset-0 h-full w-full' : ''" :style="size === 'fullscreen' ? undefined : {width: ({small: '25vmin', medium: '40vmin', large: '65vmin', xlarge: '85vmin'} as Record<string, string>)[size], aspectRatio: `${properties.data.value.width} / ${properties.data.value.height}`}" :aria-label='$t("Change camera size")' @click="cycle">
                <DuststreamCanvas :width="properties.data.value.width" :height="properties.data.value.height" />
            </button>
        </div>
    </section>
</template>
