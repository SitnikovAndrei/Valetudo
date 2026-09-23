<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {cloneJson} from "../cloneJson";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import {Capability, type DoNotDisturbConfiguration} from "../../../frontend/src/api/types";
import {fetchDoNotDisturbConfiguration, fetchSpeakerVolumeState, fetchVoicePackManagementState, sendDoNotDisturbConfiguration, sendSpeakerTestCommand, sendSpeakerVolume, sendVoicePackManagementCommand} from "../../../frontend/src/api/client";
import {valueLabel} from "../i18n/labels";

const props = defineProps<{capabilities: Capability[]}>();
const queryClient = useQueryClient();
const speakerEnabled = computed(() => props.capabilities.includes(Capability.SpeakerVolumeControl) && props.capabilities.includes(Capability.SpeakerTest));
const speaker = useQuery({queryKey: ["speakerVolume"], queryFn: fetchSpeakerVolumeState, enabled: speakerEnabled});
const volume = ref(0);
watch(speaker.data, value => {if (value) volume.value = value.volume;}, {immediate: true});
const saveVolume = useMutation({mutationFn: sendSpeakerVolume, onSuccess: () => queryClient.invalidateQueries({queryKey: ["speakerVolume"]})});
const test = useMutation({mutationFn: sendSpeakerTestCommand});
const dnd = useQuery({queryKey: ["dndConfiguration"], queryFn: fetchDoNotDisturbConfiguration, enabled: computed(() => props.capabilities.includes(Capability.DoNotDisturb))});
const draft = ref<DoNotDisturbConfiguration>({enabled: false, start: {hour: 0, minute: 0}, end: {hour: 0, minute: 0}});
const start = ref("00:00");
const end = ref("00:00");
watch(dnd.data, value => {
    if (!value) return;
    draft.value = cloneJson(value);
    const local = (utc: {hour: number; minute: number}) => {const date = new Date(); date.setUTCHours(utc.hour, utc.minute, 0, 0); return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;};
    start.value = local(value.start);
    end.value = local(value.end);
}, {immediate: true});
const saveDnd = useMutation({mutationFn: sendDoNotDisturbConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["dndConfiguration"]})});
const voice = useQuery({queryKey: ["voicePack"], queryFn: fetchVoicePackManagementState, enabled: computed(() => props.capabilities.includes(Capability.VoicePackManagement)), refetchInterval: query => ["downloading", "installing"].includes(query.state.data?.operationStatus.type ?? "") ? 1000 : false});
const url = ref("");
const language = ref("");
const hash = ref("");
const saveVoice = useMutation({mutationFn: sendVoicePackManagementCommand, onSuccess: () => queryClient.invalidateQueries({queryKey: ["voicePack"]})});

function saveDndConfiguration() {
    const converted = cloneJson(draft.value);
    const toUTC = (text: string) => {const [hour, minute] = text.split(":").map(Number); const date = new Date(); date.setHours(hour, minute, 0, 0); return {hour: date.getUTCHours(), minute: date.getUTCMinutes()};};
    converted.start = toUTC(start.value);
    converted.end = toUTC(end.value);
    saveDnd.mutate(converted);
}
</script>

<template>
    <section class="grid gap-5 md:grid-cols-2">
        <h1 class="text-2xl font-bold md:col-span-2">{{ $t("Robot system options") }}</h1>
        <div v-if="speakerEnabled" class="panel"><h2 class="mb-4 text-xl font-semibold">{{ $t("Speaker") }}</h2><p v-if="speaker.isPending.value" role="status">{{ $t("Loading…") }}</p><template v-else><label class="flex flex-col gap-2">{{ $t("Volume") }} <InputNumber v-model="volume" :min="0" :max="100" :disabled="speaker.isError.value || saveVolume.isPending.value" :use-grouping="false" /></label><div class="mt-4 flex gap-2"><Button :label='$t("Apply volume")' :disabled="volume === speaker.data.value?.volume" :loading="saveVolume.isPending.value" @click="saveVolume.mutate(volume)" /><Button :label='$t("Test sound")' outlined :loading="test.isPending.value" @click="test.mutate()" /></div></template><Message v-if="speaker.isError.value || saveVolume.isError.value || test.isError.value" severity="error" class="mt-4">{{ $t("Speaker request failed.") }}</Message></div>
        <div v-if="capabilities.includes(Capability.DoNotDisturb)" class="panel"><h2 class="mb-4 text-xl font-semibold">{{ $t("Do not disturb") }}</h2><p v-if="dnd.isPending.value" role="status">{{ $t("Loading…") }}</p><template v-else><label class="flex items-center gap-2"><Checkbox v-model="draft.enabled" binary /> {{ $t("Enabled") }}</label><div class="mt-4 flex gap-4"><label class="flex flex-col gap-1">{{ $t("Start") }} <input v-model="start" type="time" :disabled="!draft.enabled" class="rounded-lg border p-2" style="background: var(--app-surface); border-color: var(--app-border)" /></label><label class="flex flex-col gap-1">{{ $t("End") }} <input v-model="end" type="time" :disabled="!draft.enabled" class="rounded-lg border p-2" style="background: var(--app-surface); border-color: var(--app-border)" /></label></div><Button :label='$t("Apply")' class="mt-4" :loading="saveDnd.isPending.value" @click="saveDndConfiguration" /></template><Message v-if="dnd.isError.value || saveDnd.isError.value" severity="error" class="mt-4">{{ $t("Do not disturb request failed.") }}</Message></div>
        <div v-if="capabilities.includes(Capability.VoicePackManagement)" class="panel md:col-span-2"><h2 class="mb-4 text-xl font-semibold">{{ $t("Voice packs") }}</h2><p v-if="voice.isPending.value" role="status">{{ $t("Loading…") }}</p><template v-else><p>{{ $t("Current language:") }} {{ voice.data.value?.currentLanguage }}</p><p class="mt-2">{{ valueLabel(voice.data.value?.operationStatus.type) }}</p><ProgressBar v-if="['downloading', 'installing'].includes(voice.data.value?.operationStatus.type ?? '')" class="my-4" :value="voice.data.value?.operationStatus.progress" :mode="voice.data.value?.operationStatus.progress === undefined ? 'indeterminate' : 'determinate'" /><form class="mt-4 grid gap-3" @submit.prevent="saveVoice.mutate({action: 'download', url, language, hash})"><label class="flex flex-col gap-1">{{ $t("URL") }} <InputText v-model="url" type="url" :placeholder='$t("https://")' required /></label><label class="flex flex-col gap-1">{{ $t("Language code") }} <InputText v-model="language" required /></label><label class="flex flex-col gap-1">{{ $t("Hash") }} <InputText v-model="hash" required /></label><Button type="submit" :label='$t("Set voice pack")' :disabled="['downloading', 'installing'].includes(voice.data.value?.operationStatus.type ?? '')" :loading="saveVoice.isPending.value" /></form></template><Message v-if="voice.isError.value || saveVoice.isError.value" severity="error" class="mt-4">{{ $t("Voice pack request failed.") }}</Message></div>
    </section>
</template>
