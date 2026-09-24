<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import Message from "primevue/message";
import {Capability, ValetudoMapAnnotationType, type Point} from "../api/types";
import {RawMapEntityType, type RawMapEntity} from "../api/RawMapData";
import {fetchMapAnnotationsProperties, sendMapAnnotationsUpdate} from "../api/client";
import {useRobotMap} from "../composables/useRobotMap";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import MapCanvas from "../components/MapCanvas.vue";
import {cloneJson} from "../cloneJson";
import {valueLabel} from "../i18n/labels";
import PageHeader from "../components/PageHeader.vue";

type Shape = {a: Point; b: Point};
const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const queryClient = useQueryClient();
const map = useRobotMap();
const {status} = useRobotAttributes();
const properties = useQuery({queryKey: ["mapAnnotationsProperties"], queryFn: fetchMapAnnotationsProperties, enabled: props.capabilities.includes(Capability.MapAnnotations)});
const annotationTypes = [RawMapEntityType.Threshold, RawMapEntityType.Curtain, RawMapEntityType.Ramp];
const mode = ref<"pan" | ValetudoMapAnnotationType>("pan");
const draft = ref<RawMapEntity[]>([]);
const original = ref<RawMapEntity[]>([]);
watch(map.data, value => {if (!value || JSON.stringify(draft.value) !== JSON.stringify(original.value)) return; original.value = cloneJson(value.entities.filter(entity => annotationTypes.includes(entity.type))); draft.value = cloneJson(original.value);}, {immediate: true});
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(original.value));
const maxX = computed(() => map.data.value?.size.x ?? 0);
const maxY = computed(() => map.data.value?.size.y ?? 0);
const canEdit = computed(() => status.value?.value === "docked");
const displayedMap = computed(() => map.data.value && ({...map.data.value, entities: [...map.data.value.entities.filter(entity => !annotationTypes.includes(entity.type)), ...draft.value]}));
const save = useMutation({mutationFn: () => sendMapAnnotationsUpdate(draft.value.map(entity => ({type: entity.type as unknown as ValetudoMapAnnotationType, points: Array.from({length: entity.points.length / 2}, (_, index) => ({x: entity.points[index * 2], y: entity.points[index * 2 + 1]}))}))), onSuccess: async () => {original.value = cloneJson(draft.value); await queryClient.invalidateQueries({queryKey: ["robotMap"]}); mode.value = "pan";}});
function addShape(shape: Shape) {
    if (!canEdit.value || !map.data.value || mode.value === "pan") return;
    const unit = map.data.value.pixelSize;
    const a = {x: Math.round(shape.a.x * unit), y: Math.round(shape.a.y * unit)};
    const b = {x: Math.round(shape.b.x * unit), y: Math.round(shape.b.y * unit)};
    draft.value.push({type: mode.value as unknown as RawMapEntityType, metaData: {}, points: mode.value === ValetudoMapAnnotationType.Ramp ? [a.x, a.y, b.x, a.y, b.x, b.y, a.x, b.y] : [a.x, a.y, b.x, b.y]});
    mode.value = "pan";
}
function discard() {draft.value = cloneJson(original.value); mode.value = "pan";}
function setCoordinate(entityIndex: number, pointIndex: number, value: number | null) {
    if (!canEdit.value || value === null || !map.data.value) return;
    const limit = pointIndex % 2 === 0 ? map.data.value.size.x : map.data.value.size.y;
    draft.value[entityIndex].points[pointIndex] = Math.max(0, Math.min(limit, Math.round(value)));
}
function moveEntity(index: number, points: number[]) {if (canEdit.value && draft.value[index]) draft.value[index].points = points;}
</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Map annotations')" />
        <section class="panel">
            <Message v-if="!capabilities.includes(Capability.MapAnnotations)" severity="warn">{{ $t("Annotations are unavailable on this robot.") }}</Message>
            <p v-else-if="map.isPending.value || properties.isPending.value" role="status">{{ $t("Loading map…") }}</p>
            <Message v-else-if="map.isError.value || properties.isError.value" severity="error">{{ $t("Unable to load map or annotation types.") }}</Message>
            <template v-else-if="displayedMap">
                <Message v-if="!canEdit" severity="info" class="mb-3">{{ $t("Dock the robot to edit annotations.") }}</Message>
                <div class="mb-3 flex flex-wrap gap-2"><Button :label='$t("Pan")' :outlined="mode !== 'pan'" @click="mode = 'pan'" /><Button v-for="type in properties.data.value?.supportedAnnotationTypes" :key="type" :label="`${$t('Add')} ${valueLabel(type)}`" :disabled="!canEdit" :outlined="mode !== type" @click="mode = type" /></div>
                <p class="muted mb-2 text-sm">{{ mode === 'pan' ? $t("Drag an existing annotation to move it; drag elsewhere or pinch to move the map.") : $t("Drag on the map to draw the annotation.") }}</p>
                <div class="h-[min(60vh,600px)] overflow-hidden rounded-xl" style="background: var(--app-bg)"><MapCanvas :map="displayedMap" :palette-mode="paletteMode" :mode="mode === 'pan' ? 'pan' : mode === ValetudoMapAnnotationType.Ramp ? 'rectangle' : 'line'" :selected-segment-ids="[]" :zones="[]" :editable-entities="canEdit ? draft : []" @shape-created="addShape" @entity-updated="moveEntity" /></div>
                <div v-for="(entity, index) in draft" :key="index" class="border-b py-3" style="border-color: var(--app-border)"><div class="mb-2 flex items-center justify-between"><strong>{{ valueLabel(entity.type) }}</strong><Button :label='$t("Remove")' text severity="danger" :disabled="!canEdit" @click="draft.splice(index, 1)" /></div><div class="flex flex-wrap gap-2"><label v-for="(coordinate, pointIndex) in entity.points" :key="pointIndex" class="flex items-center gap-1 text-sm">{{ pointIndex % 2 ? 'Y' : 'X' }}{{ Math.floor(pointIndex / 2) + 1 }} <InputNumber :model-value="coordinate" :disabled="!canEdit" :min="0" :max="pointIndex % 2 ? maxY : maxX" :use-grouping="false" input-class="w-24" @update:model-value="setCoordinate(index, pointIndex, $event)" /></label></div></div>
                <div class="mt-4 flex gap-2"><Button :label='$t("Save")' :disabled="!dirty || !canEdit || save.isPending.value" :loading="save.isPending.value" @click="save.mutate()" /><Button :label='$t("Discard")' outlined :disabled="!dirty" @click="discard" /></div>
                <Message v-if="save.isError.value" severity="error" class="mt-3">{{ $t("Unable to save annotations.") }}</Message>
            </template>
        </section>
    </div>
</template>
