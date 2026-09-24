<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import {Capability} from "../api/types";
import {fetchSpeakerVolumeState, fetchVoicePackManagementState, sendSpeakerTestCommand, sendSpeakerVolume, sendVoicePackManagementCommand} from "../api/client";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]}>();
const queryClient = useQueryClient();
const speakerEnabled = computed(() => props.capabilities.includes(Capability.SpeakerVolumeControl) && props.capabilities.includes(Capability.SpeakerTest));
const speaker = useQuery({queryKey: ["speakerVolume"], queryFn: fetchSpeakerVolumeState, enabled: speakerEnabled});
const volume = ref(0);
watch(speaker.data, value => {if (value) volume.value = value.volume;}, {immediate: true});
const saveVolume = useMutation({mutationFn: sendSpeakerVolume, onSuccess: () => queryClient.invalidateQueries({queryKey: ["speakerVolume"]})});
const test = useMutation({mutationFn: sendSpeakerTestCommand});
const voice = useQuery({queryKey: ["voicePack"], queryFn: fetchVoicePackManagementState, enabled: computed(() => props.capabilities.includes(Capability.VoicePackManagement)), refetchInterval: query => ["downloading", "installing"].includes(query.state.data?.operationStatus.type ?? "") ? 1000 : false});
const url = ref("");
const language = ref("");
const hash = ref("");
const saveVoice = useMutation({mutationFn: sendVoicePackManagementCommand, onSuccess: () => queryClient.invalidateQueries({queryKey: ["voicePack"]})});

</script>

<template>
    <section class="grid gap-5 md:grid-cols-2">
        <h1 class="text-2xl font-bold md:col-span-2">{{ $t("Robot system options") }}</h1>
        <div v-if="speakerEnabled" class="panel"><h2 class="mb-4 text-xl font-semibold">{{ $t("Speaker") }}</h2><p v-if="speaker.isPending.value" role="status">{{ $t("Loading…") }}</p><template v-else><label class="flex flex-col gap-2">{{ $t("Volume") }} <InputNumber v-model="volume" :min="0" :max="100" :disabled="speaker.isError.value || saveVolume.isPending.value" :use-grouping="false" /></label><div class="mt-4 flex gap-2"><Button :label='$t("Apply volume")' :disabled="volume === speaker.data.value?.volume" :loading="saveVolume.isPending.value" @click="saveVolume.mutate(volume)" /><Button :label='$t("Test sound")' outlined :loading="test.isPending.value" @click="test.mutate()" /></div></template><Message v-if="speaker.isError.value || saveVolume.isError.value || test.isError.value" severity="error" class="mt-4">{{ $t("Speaker request failed.") }}</Message></div>
        <div v-if="capabilities.includes(Capability.VoicePackManagement)" class="panel md:col-span-2"><h2 class="mb-4 text-xl font-semibold">{{ $t("Voice packs") }}</h2><p v-if="voice.isPending.value" role="status">{{ $t("Loading…") }}</p><template v-else><p>{{ $t("Current language:") }} {{ voice.data.value?.currentLanguage }}</p><p class="mt-2">{{ valueLabel(voice.data.value?.operationStatus.type) }}</p><ProgressBar v-if="['downloading', 'installing'].includes(voice.data.value?.operationStatus.type ?? '')" class="my-4" :value="voice.data.value?.operationStatus.progress" :mode="voice.data.value?.operationStatus.progress === undefined ? 'indeterminate' : 'determinate'" /><form class="mt-4 grid gap-3" @submit.prevent="saveVoice.mutate({action: 'download', url, language, hash})"><label class="flex flex-col gap-1">{{ $t("URL") }} <InputText v-model="url" type="url" :placeholder='$t("https://")' required /></label><label class="flex flex-col gap-1">{{ $t("Language code") }} <InputText v-model="language" required /></label><label class="flex flex-col gap-1">{{ $t("Hash") }} <InputText v-model="hash" required /></label><Button type="submit" :label='$t("Set voice pack")' :disabled="['downloading', 'installing'].includes(voice.data.value?.operationStatus.type ?? '')" :loading="saveVoice.isPending.value" /></form></template><Message v-if="voice.isError.value || saveVoice.isError.value" severity="error" class="mt-4">{{ $t("Voice pack request failed.") }}</Message></div>
    </section>
</template>
