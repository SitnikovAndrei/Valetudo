<script setup lang="ts">
import {computed, ref} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import {Capability, ValetudoTimerActionType, ValetudoTimerPreActionType, type Timer} from "../api/types";
import {deleteTimer, fetchMapSegmentationProperties, fetchPresetSelections, fetchSegments, fetchTimerInformation, fetchTimerProperties, sendTimerAction, sendTimerCreation, sendTimerUpdate} from "../api/client";
import {shiftTimer} from "../timerTime";
import {translate} from "../i18n";
import {valueLabel} from "../i18n/labels";

const queryClient = useQueryClient();
const timers = useQuery({queryKey: ["timers"], queryFn: fetchTimerInformation});
const properties = useQuery({queryKey: ["timerProperties"], queryFn: fetchTimerProperties});
const segments = useQuery({queryKey: ["segments"], queryFn: fetchSegments, enabled: computed(() => properties.data.value?.supportedActions.includes(ValetudoTimerActionType.SEGMENT_CLEANUP) ?? false)});
const segmentation = useQuery({queryKey: ["segmentationProperties"], queryFn: fetchMapSegmentationProperties, enabled: computed(() => properties.data.value?.supportedActions.includes(ValetudoTimerActionType.SEGMENT_CLEANUP) ?? false)});
const presetCapabilities: Record<ValetudoTimerPreActionType, Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl> = {
    [ValetudoTimerPreActionType.FAN_SPEED_CONTROL]: Capability.FanSpeedControl,
    [ValetudoTimerPreActionType.WATER_USAGE_CONTROL]: Capability.WaterUsageControl,
    [ValetudoTimerPreActionType.OPERATION_MODE_CONTROL]: Capability.OperationModeControl
};
const presets = useQuery({
    queryKey: ["timerPresetOptions"],
    queryFn: async () => Object.fromEntries(await Promise.all((properties.data.value?.supportedPreActions ?? []).map(async type => [type, (await fetchPresetSelections(presetCapabilities[type])).filter(value => value !== "custom")]))),
    enabled: computed(() => (properties.data.value?.supportedPreActions.length ?? 0) > 0)
});
const weekdays = computed(() => [{label: translate("Mon"), value: 1}, {label: translate("Tue"), value: 2}, {label: translate("Wed"), value: 3}, {label: translate("Thu"), value: 4}, {label: translate("Fri"), value: 5}, {label: translate("Sat"), value: 6}, {label: translate("Sun"), value: 0}]);
const draft = ref<Timer>();
const deleteId = ref<string>();
const executeId = ref<string>();
const localTime = ref("06:00");
const selectedSegments = computed({get: () => draft.value?.action.params.segment_ids as string[] ?? [], set: value => {if (draft.value) draft.value.action.params.segment_ids = value;}});
const iterations = computed({get: () => draft.value?.action.params.iterations as number ?? 1, set: value => {if (draft.value) draft.value.action.params.iterations = value;}});
const customOrder = computed({get: () => draft.value?.action.params.custom_order as boolean ?? false, set: value => {if (draft.value) draft.value.action.params.custom_order = value;}});
const valid = computed(() => {
    if (!draft.value || !draft.value.dow.length || !properties.data.value?.supportedActions.includes(draft.value.action.type)) return false;
    if (draft.value.action.type === ValetudoTimerActionType.SEGMENT_CLEANUP) {
        if (!selectedSegments.value.length || segmentation.isError.value || segments.isError.value) return false;
        const range = segmentation.data.value?.iterationCount;
        if (!range || iterations.value < range.min || iterations.value > range.max) return false;
    }
    return (draft.value.pre_actions ?? []).every(item => Boolean(item.params.value));
});
const mutation = useMutation({mutationFn: async (operation: {kind: "save"; timer: Timer} | {kind: "delete"; id: string} | {kind: "execute"; id: string}) => {
    if (operation.kind === "delete") return deleteTimer(operation.id);
    if (operation.kind === "execute") return sendTimerAction(operation.id, "execute_now");
    const converted = shiftTimer(operation.timer, new Date().getTimezoneOffset());
    return converted.id ? sendTimerUpdate(converted) : sendTimerCreation(converted);
}, onSuccess: async () => {
    draft.value = undefined;
    deleteId.value = undefined;
    executeId.value = undefined;
    await queryClient.invalidateQueries({queryKey: ["timers"]});
}});

function newTimer() {
    draft.value = {id: "", enabled: true, dow: [1, 2, 3, 4, 5], hour: 6, minute: 0, action: {type: properties.data.value?.supportedActions[0] ?? ValetudoTimerActionType.FULL_CLEANUP, params: {}}};
    localTime.value = "06:00";
}

function edit(timer: Timer) {
    draft.value = shiftTimer(timer, -new Date().getTimezoneOffset());
    localTime.value = `${draft.value.hour.toString().padStart(2, "0")}:${draft.value.minute.toString().padStart(2, "0")}`;
}

function toggleDay(day: number) {
    if (!draft.value) return;
    draft.value.dow = draft.value.dow.includes(day) ? draft.value.dow.filter(value => value !== day) : [...draft.value.dow, day];
}

function setPreAction(type: ValetudoTimerPreActionType, value: string | undefined) {
    if (!draft.value) return;
    draft.value.pre_actions = (draft.value.pre_actions ?? []).filter(item => item.type !== type);
    if (value) draft.value.pre_actions.push({type, params: {value}});
}

function save() {
    if (!draft.value || !valid.value || mutation.isPending.value) return;
    const [hour, minute] = localTime.value.split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
    mutation.mutate({kind: "save", timer: {...draft.value, hour, minute}});
}

function changeAction(type: ValetudoTimerActionType) {
    if (draft.value) draft.value.action = {type, params: {}};
}
</script>

<template>
    <section class="panel">
        <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">{{ $t("Timers") }}</h1><Button :label='$t("Add timer")' :disabled="properties.isPending.value" @click="newTimer" /></div>
        <p v-if="timers.isPending.value || properties.isPending.value" role="status">{{ $t("Loading timers…") }}</p>
        <Message v-else-if="timers.isError.value || properties.isError.value || mutation.isError.value" severity="error">{{ $t("Timer request failed.") }}</Message>
        <p v-else-if="!Object.keys(timers.data.value ?? {}).length" class="muted">{{ $t("You have no timers configured.") }}</p>
        <div v-for="timer in timers.data.value" :key="timer.id" class="mb-3 rounded-lg border p-4" style="border-color: var(--app-border)">
            <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold">{{ timer.label || $t("Timer") }} · {{ timer.enabled ? $t("Enabled") : $t("Disabled") }}</h2><p>{{ shiftTimer(timer, -new Date().getTimezoneOffset()).hour.toString().padStart(2, '0') }}:{{ shiftTimer(timer, -new Date().getTimezoneOffset()).minute.toString().padStart(2, '0') }} · {{ valueLabel(timer.action.type) }}</p></div><div class="flex gap-2"><Button :label='$t("Edit")' outlined @click="edit(timer)" /><Button :label='$t("Run now")' outlined @click="executeId = timer.id" /><Button :label='$t("Delete")' severity="danger" outlined @click="deleteId = timer.id" /></div></div>
        </div>
        <Dialog :visible="Boolean(draft)" modal :header="draft?.id ? $t('Edit timer') : $t('Add timer')" class="w-[min(95vw,42rem)]" @update:visible="draft = undefined">
            <div v-if="draft" class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-1">
                <label class="flex items-center gap-2"><Checkbox v-model="draft.enabled" binary /> {{ $t("Enabled") }}</label>
                <label class="flex flex-col gap-1">{{ $t("Custom label") }} <InputText v-model="draft.label" maxlength="24" /></label>
                <fieldset><legend class="mb-2 font-semibold">{{ $t("Days") }}</legend><div class="flex flex-wrap gap-3"><label v-for="day in weekdays" :key="day.value" class="flex items-center gap-1"><Checkbox :model-value="draft.dow.includes(day.value)" binary @update:model-value="toggleDay(day.value)" /> {{ day.label }}</label></div></fieldset>
                <label class="flex flex-col gap-1">{{ $t("Time") }} ({{ Intl.DateTimeFormat().resolvedOptions().timeZone }}) <input v-model="localTime" type="time" required class="rounded-lg border p-2" style="border-color: var(--app-border); background: var(--app-surface)" /></label>
                <label class="flex flex-col gap-1">{{ $t("Action") }} <Select :model-value="draft.action.type" :options="(properties.data.value?.supportedActions ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" @update:model-value="changeAction" /></label>
                <template v-if="draft.action.type === ValetudoTimerActionType.SEGMENT_CLEANUP">
                    <Message v-if="segments.isError.value || segmentation.isError.value" severity="error">{{ $t("Unable to load segments.") }}</Message>
                    <fieldset><legend class="mb-2 font-semibold">{{ $t("Segments") }}</legend><div class="grid gap-2 sm:grid-cols-2"><label v-for="segment in segments.data.value" :key="segment.id" class="flex items-center gap-2"><Checkbox :model-value="selectedSegments.includes(segment.id)" binary @update:model-value="selectedSegments = selectedSegments.includes(segment.id) ? selectedSegments.filter(id => id !== segment.id) : [...selectedSegments, segment.id]" /> {{ segment.name || segment.id }}</label></div></fieldset>
                    <label class="flex flex-col gap-1">{{ $t("Iterations") }} <InputNumber v-model="iterations" :min="segmentation.data.value?.iterationCount.min ?? 1" :max="segmentation.data.value?.iterationCount.max ?? 1" :use-grouping="false" /></label>
                    <label v-if="segmentation.data.value?.customOrderSupport" class="flex items-center gap-2"><Checkbox v-model="customOrder" binary /> {{ $t("Use custom order") }}</label>
                </template>
                <fieldset v-if="properties.data.value?.supportedPreActions.length"><legend class="mb-2 font-semibold">{{ $t("Pre-actions") }}</legend><div class="flex flex-col gap-3"><label v-for="type in properties.data.value.supportedPreActions" :key="type" class="flex flex-col gap-1">{{ valueLabel(type) }} <Select :model-value="draft.pre_actions?.find(item => item.type === type)?.params.value" :options="(presets.data.value?.[type] ?? []).map((value: string) => ({label: valueLabel(value), value}))" option-label="label" option-value="value" show-clear :disabled="presets.isPending.value" @update:model-value="value => setPreAction(type, value)" /></label></div></fieldset>
            </div>
            <div class="mt-5 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="draft = undefined" /><Button :label='$t("Save")' :loading="mutation.isPending.value" :disabled="!valid" @click="save" /></div>
        </Dialog>
        <Dialog :visible="Boolean(deleteId)" modal :header='$t("Delete timer?")' @update:visible="deleteId = undefined"><p>{{ $t("Delete this timer permanently?") }}</p><div class="mt-4 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="deleteId = undefined" /><Button :label='$t("Delete")' severity="danger" :loading="mutation.isPending.value" @click="deleteId && mutation.mutate({kind: 'delete', id: deleteId})" /></div></Dialog>
        <Dialog :visible="Boolean(executeId)" modal :header='$t("Run timer now?")' @update:visible="executeId = undefined"><p>{{ $t("Execute this timer action now?") }}</p><div class="mt-4 flex justify-end gap-2"><Button :label='$t("Cancel")' text @click="executeId = undefined" /><Button :label='$t("Run now")' :loading="mutation.isPending.value" @click="executeId && mutation.mutate({kind: 'execute', id: executeId})" /></div></Dialog>
    </section>
</template>
