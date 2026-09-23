<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import Message from "primevue/message";
import {Capability, ValetudoRestrictedZoneType, type Point} from "../../../frontend/src/api/types";
import {RawMapEntityType, type RawMapEntity} from "../../../frontend/src/api/RawMapData";
import {fetchCombinedVirtualRestrictionsProperties, sendCombinedVirtualRestrictionsUpdate} from "../../../frontend/src/api/client";
import {useRobotMap} from "../composables/useRobotMap";
import {useRobotAttributes} from "../composables/useRobotAttributes";
import MapCanvas from "../components/MapCanvas.vue";
import {cloneJson} from "../cloneJson";

type Shape = {a: Point; b: Point};
const props = defineProps<{capabilities: Capability[]; paletteMode: "light" | "dark"}>();
const queryClient = useQueryClient();
const map = useRobotMap();
const {status} = useRobotAttributes();
const properties = useQuery({queryKey: ["virtualRestrictionsProperties"], queryFn: fetchCombinedVirtualRestrictionsProperties, enabled: props.capabilities.includes(Capability.CombinedVirtualRestrictions)});
const mode = ref<"pan" | "wall" | "regular" | "mop">("pan");
const draft = ref<RawMapEntity[]>([]);
const original = ref<RawMapEntity[]>([]);
const restrictionTypes = [RawMapEntityType.VirtualWall, RawMapEntityType.NoGoArea, RawMapEntityType.NoMopArea];
watch(map.data, value => {
    if (!value) return;
    if (JSON.stringify(draft.value) !== JSON.stringify(original.value)) return;
    original.value = cloneJson(value.entities.filter(entity => restrictionTypes.includes(entity.type)));
    draft.value = cloneJson(original.value);
}, {immediate: true});
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(original.value));
const maxX = computed(() => map.data.value?.size.x ?? 0);
const maxY = computed(() => map.data.value?.size.y ?? 0);
const canEdit = computed(() => status.value?.value === "docked");
const displayedMap = computed(() => map.data.value && ({...map.data.value, entities: [...map.data.value.entities.filter(entity => !restrictionTypes.includes(entity.type)), ...draft.value]}));
const save = useMutation({mutationFn: async () => {
    const points = (entity: RawMapEntity) => entity.points;
    await sendCombinedVirtualRestrictionsUpdate({
        virtualWalls: draft.value.filter(entity => entity.type === RawMapEntityType.VirtualWall).map(entity => ({points: {pA: {x: points(entity)[0], y: points(entity)[1]}, pB: {x: points(entity)[2], y: points(entity)[3]}}})),
        restrictedZones: draft.value.filter(entity => entity.type === RawMapEntityType.NoGoArea || entity.type === RawMapEntityType.NoMopArea).map(entity => ({type: entity.type === RawMapEntityType.NoMopArea ? ValetudoRestrictedZoneType.Mop : ValetudoRestrictedZoneType.Regular, points: {pA: {x: entity.points[0], y: entity.points[1]}, pB: {x: entity.points[2], y: entity.points[3]}, pC: {x: entity.points[4], y: entity.points[5]}, pD: {x: entity.points[6], y: entity.points[7]}}}))
    });
}, onSuccess: async () => {original.value = cloneJson(draft.value); await queryClient.invalidateQueries({queryKey: ["robotMap"]}); mode.value = "pan";}});

function addShape(shape: Shape) {
    if (!canEdit.value || !map.data.value || mode.value === "pan") return;
    const unit = map.data.value.pixelSize;
    const a = {x: Math.round(shape.a.x * unit), y: Math.round(shape.a.y * unit)};
    const b = {x: Math.round(shape.b.x * unit), y: Math.round(shape.b.y * unit)};
    draft.value.push({
        type: mode.value === "wall" ? RawMapEntityType.VirtualWall : mode.value === "mop" ? RawMapEntityType.NoMopArea : RawMapEntityType.NoGoArea,
        metaData: {},
        points: mode.value === "wall" ? [a.x, a.y, b.x, b.y] : [a.x, a.y, b.x, a.y, b.x, b.y, a.x, b.y]
    });
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
    <section class="panel">
        <h1 class="mb-4 text-2xl font-bold">Virtual restrictions</h1>
        <Message v-if="!capabilities.includes(Capability.CombinedVirtualRestrictions)" severity="warn">Virtual restrictions are unavailable on this robot.</Message>
        <p v-else-if="map.isPending.value || properties.isPending.value" role="status">Loading map…</p>
        <Message v-else-if="map.isError.value || properties.isError.value" severity="error">Unable to load map or restriction types.</Message>
        <template v-else-if="displayedMap">
            <Message v-if="!canEdit" severity="info" class="mb-3">Dock the robot to edit virtual restrictions.</Message>
            <div class="mb-3 flex flex-wrap gap-2"><Button label="Pan" :outlined="mode !== 'pan'" @click="mode = 'pan'" /><Button label="Add wall" :disabled="!canEdit" :outlined="mode !== 'wall'" @click="mode = 'wall'" /><Button v-if="properties.data.value?.supportedRestrictedZoneTypes.includes(ValetudoRestrictedZoneType.Regular)" label="Add no-go zone" :disabled="!canEdit" :outlined="mode !== 'regular'" @click="mode = 'regular'" /><Button v-if="properties.data.value?.supportedRestrictedZoneTypes.includes(ValetudoRestrictedZoneType.Mop)" label="Add no-mop zone" :disabled="!canEdit" :outlined="mode !== 'mop'" @click="mode = 'mop'" /></div>
            <p class="muted mb-2 text-sm">{{ mode === 'pan' ? 'Drag an existing restriction to move it; drag elsewhere or pinch to move the map.' : 'Drag on the map to draw the restriction.' }}</p>
            <div class="h-[min(60vh,600px)] overflow-hidden rounded-xl" style="background: var(--app-bg)"><MapCanvas :map="displayedMap" :palette-mode="paletteMode" :mode="mode === 'wall' ? 'line' : mode === 'pan' ? 'pan' : 'rectangle'" :selected-segment-ids="[]" :zones="[]" :editable-entities="canEdit ? draft : []" @shape-created="addShape" @entity-updated="moveEntity" /></div>
            <div v-for="(entity, index) in draft" :key="index" class="border-b py-3" style="border-color: var(--app-border)"><div class="mb-2 flex items-center justify-between"><strong>{{ entity.type.replace(/_/g, ' ') }}</strong><Button label="Remove" text severity="danger" :disabled="!canEdit" @click="draft.splice(index, 1)" /></div><div class="flex flex-wrap gap-2"><label v-for="(coordinate, pointIndex) in entity.points" :key="pointIndex" class="flex items-center gap-1 text-sm">{{ pointIndex % 2 ? 'Y' : 'X' }}{{ Math.floor(pointIndex / 2) + 1 }} <InputNumber :model-value="coordinate" :disabled="!canEdit" :min="0" :max="pointIndex % 2 ? maxY : maxX" :use-grouping="false" input-class="w-24" @update:model-value="setCoordinate(index, pointIndex, $event)" /></label></div></div>
            <div class="mt-4 flex gap-2"><Button label="Save" :disabled="!dirty || !canEdit || save.isPending.value" :loading="save.isPending.value" @click="save.mutate()" /><Button label="Discard" outlined :disabled="!dirty" @click="discard" /></div>
            <Message v-if="save.isError.value" severity="error" class="mt-3">Unable to save restrictions.</Message>
        </template>
    </section>
</template>
