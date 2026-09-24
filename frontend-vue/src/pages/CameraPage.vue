<script setup lang="ts">
import {ref} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {Capability} from "../api/types";
import {fetchDuststreamingProperties} from "../api/client";
import DuststreamCanvas from "../components/DuststreamCanvas.vue";

const props = defineProps<{capabilities: Capability[]}>();
const configuration = useQuery({...duststreamConfigurationQuery, enabled: props.capabilities.includes(Capability.Duststreaming)});
const properties = useQuery({queryKey: ["duststreamProperties"], queryFn: fetchDuststreamingProperties, enabled: props.capabilities.includes(Capability.Duststreaming)});
const fullscreen = ref(false);
function escape(event: KeyboardEvent) {if (event.key === "Escape") fullscreen.value = false;}
window.addEventListener("keydown", escape);
import {onBeforeUnmount} from "vue";
import PageHeader from "../components/PageHeader.vue";
import {duststreamConfigurationQuery} from "../api/queries";
onBeforeUnmount(() => window.removeEventListener("keydown", escape));
</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Camera')">
            <template #actions><Button :label='$t("Fullscreen")' text :disabled="!properties.data.value" @click="fullscreen = !fullscreen" /></template>
        </PageHeader>
        <section class="panel">
            <Message v-if="!capabilities.includes(Capability.Duststreaming)" severity="warn">{{ $t("Camera unavailable on this robot.") }}</Message>
            <p v-else-if="properties.isPending.value || configuration.isPending.value" role="status">{{ $t("Loading camera…") }}</p>
            <Message v-else-if="properties.isError.value || configuration.isError.value" severity="error">{{ $t("Camera information unavailable.") }}</Message>
            <Message v-else-if="!configuration.data.value?.enabled" severity="info">{{ $t("Enable the camera stream in Valetudo options.") }}</Message>
            <Message v-else-if="!properties.data.value?.duststreamerInstalled" severity="warn">{{ $t("Duststreamer is not installed.") }}</Message>
            <div v-else-if="properties.data.value" :class="fullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black' : 'relative mx-auto max-w-4xl bg-black'" :style="fullscreen ? undefined : {aspectRatio: `${properties.data.value.width} / ${properties.data.value.height}`}" @click="fullscreen = !fullscreen">
                <DuststreamCanvas :width="properties.data.value.width" :height="properties.data.value.height" />
            </div>
        </section>
    </div>
</template>
