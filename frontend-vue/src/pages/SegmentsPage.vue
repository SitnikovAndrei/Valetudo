<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import {Capability, type MapSegmentMaterial, type Point} from "../api/types";
import {RawMapLayerType} from "../api/RawMapData";
import {fetchMapSegmentMaterialControlProperties, sendJoinSegmentsCommand, sendRenameSegmentCommand, sendSetSegmentMaterialCommand, sendSplitSegmentCommand} from "../api/client";
import {useRobotMap} from "../composables/useRobotMap";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import MapCanvas from "../components/MapCanvas.vue";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";

type Shape = {a: Point; b: Point};
const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const map = useRobotMap();
const {query: attributes, status} = useRobotAttributes();
const queryClient = useQueryClient();
const selected = ref<string[]>([]);
const line = ref<Shape>();
const mode = ref<"pan" | "segments" | "line">("segments");
const renameOpen = ref(false);
const materialOpen = ref(false);
const name = ref("");
const material = ref<MapSegmentMaterial>();
const materials = useQuery({queryKey: ["segmentMaterialProperties"], queryFn: fetchMapSegmentMaterialControlProperties, enabled: props.capabilities.includes(Capability.MapSegmentMaterialControl)});
const layers = computed(() => map.data.value?.layers.filter(layer => layer.type === RawMapLayerType.Segment && layer.metaData.segmentId) ?? []);
const canEdit = computed(() => status.value?.value === "docked");
const mutation = useMutation({mutationFn: async (action: "join" | "split" | "rename" | "material") => {
    if (!canEdit.value) throw new Error(translate("Robot must be docked to edit segments"));
    if (action === "join" && selected.value.length === 2) return sendJoinSegmentsCommand({segment_a_id: selected.value[0], segment_b_id: selected.value[1]});
    if (action === "split" && selected.value.length === 1 && line.value && map.data.value) {
        const unit = map.data.value.pixelSize;
        return sendSplitSegmentCommand({segment_id: selected.value[0], pA: {x: Math.round(line.value.a.x * unit), y: Math.round(line.value.a.y * unit)}, pB: {x: Math.round(line.value.b.x * unit), y: Math.round(line.value.b.y * unit)}});
    }
    if (action === "rename" && selected.value.length === 1) return sendRenameSegmentCommand({segment_id: selected.value[0], name: name.value.trim()});
    if (action === "material" && selected.value.length === 1 && material.value) return sendSetSegmentMaterialCommand({segment_id: selected.value[0], material: material.value});
    throw new Error(translate("Invalid segment action"));
}, onSuccess: async () => {selected.value = []; line.value = undefined; mode.value = "segments"; renameOpen.value = false; materialOpen.value = false; await queryClient.invalidateQueries({queryKey: ["robotMap"]});}});
function toggle(id: string) {selected.value = selected.value.includes(id) ? selected.value.filter(value => value !== id) : [...selected.value.slice(-1), id];}
function openRename() {name.value = layers.value.find(layer => layer.metaData.segmentId === selected.value[0])?.metaData.name ?? ""; renameOpen.value = true;}
function openMaterial() {material.value = layers.value.find(layer => layer.metaData.segmentId === selected.value[0])?.metaData.material as MapSegmentMaterial | undefined; materialOpen.value = true;}
</script>

<template>
    <section class="panel">
        <h1 class="mb-4 text-2xl font-bold">{{ $t("Segment management") }}</h1>
        <Message v-if="!capabilities.includes(Capability.MapSegmentEdit) && !capabilities.includes(Capability.MapSegmentRename) && !capabilities.includes(Capability.MapSegmentMaterialControl)" severity="warn">{{ $t("Segment editing is unavailable on this robot.") }}</Message>
        <p v-else-if="map.isPending.value" role="status">{{ $t("Loading map…") }}</p>
        <Message v-else-if="map.isError.value" severity="error">{{ $t("Unable to load map.") }} <Button :label='$t("Retry")' text @click="map.refetch()" /></Message>
        <template v-else-if="map.data.value">
            <Message v-if="attributes.isError.value" severity="error" class="mb-3">{{ $t("Unable to load robot status.") }} <Button :label='$t("Retry")' text @click="attributes.refetch()" /></Message>
            <Message v-else-if="!canEdit" severity="info" class="mb-3">{{ $t("Dock the robot to edit segments.") }}</Message>
            <div class="mb-3 flex flex-wrap gap-2"><Button :label='$t("Select segments")' :outlined="mode !== 'segments'" @click="mode = 'segments'" /><Button :label='$t("Pan")' :outlined="mode !== 'pan'" @click="mode = 'pan'" /><Button v-if="capabilities.includes(Capability.MapSegmentEdit)" :label='$t("Draw splitting line")' :disabled="!canEdit || selected.length !== 1" :outlined="mode !== 'line'" @click="mode = 'line'" /></div>
            <div class="h-[min(60vh,600px)] overflow-hidden rounded-xl" style="background: var(--app-bg)"><MapCanvas :map="map.data.value" :palette-mode="paletteMode" :mode="mode" :selected-segment-ids="selected" :zones="[]" :edit-line="line" @segment-click="toggle" @shape-created="shape => {line = shape; mode = 'segments';}" /></div>
            <div class="mt-4 flex flex-wrap gap-2" role="group" :aria-label='$t("Select segments")'><Button v-for="layer in layers" :key="layer.metaData.segmentId" :label="layer.metaData.name || layer.metaData.segmentId" size="small" :outlined="!selected.includes(layer.metaData.segmentId!)" @click="toggle(layer.metaData.segmentId!)" /></div>
            <div class="mt-4 flex flex-wrap gap-2"><Button v-if="capabilities.includes(Capability.MapSegmentRename)" :label='$t("Rename")' :disabled="!canEdit || selected.length !== 1 || mutation.isPending.value" @click="openRename" /><Button v-if="capabilities.includes(Capability.MapSegmentMaterialControl)" :label='$t("Set material")' :disabled="!canEdit || selected.length !== 1 || mutation.isPending.value" outlined @click="openMaterial" /><Button v-if="capabilities.includes(Capability.MapSegmentEdit)" :label='$t("Join")' :disabled="!canEdit || selected.length !== 2 || mutation.isPending.value" outlined @click="mutation.mutate('join')" /><Button v-if="capabilities.includes(Capability.MapSegmentEdit)" :label='$t("Split")' :disabled="!canEdit || selected.length !== 1 || !line || mutation.isPending.value" outlined @click="mutation.mutate('split')" /></div>
            <Message v-if="mutation.isError.value" severity="error" class="mt-4">{{ $t("Segment action failed.") }}</Message>
        </template>
        <Dialog v-model:visible="renameOpen" modal :header='$t("Rename segment")' class="max-w-md"><label class="flex flex-col gap-1">{{ $t("Name") }} <InputText v-model="name" /></label><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="renameOpen = false" /><Button :label='$t("Rename")' :loading="mutation.isPending.value" @click="mutation.mutate('rename')" /></div></Dialog>
        <Dialog v-model:visible="materialOpen" modal :header='$t("Segment material")' class="max-w-md"><p v-if="materials.isPending.value" role="status">{{ $t("Loading supported materials…") }}</p><Message v-else-if="materials.isError.value" severity="error">{{ $t("Unable to load supported materials.") }} <Button :label='$t("Retry")' text @click="materials.refetch()" /></Message><Select v-else v-model="material" :options="(materials.data.value?.supportedMaterials ?? []).map(value => ({label: valueLabel(value), value}))" option-label="label" option-value="value" :aria-label='$t("Material")' /><div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="materialOpen = false" /><Button :label='$t("Save")' :disabled="!material || !materials.data.value?.supportedMaterials.includes(material) || mutation.isPending.value" :loading="mutation.isPending.value" @click="mutation.mutate('material')" /></div></Dialog>
    </section>
</template>
