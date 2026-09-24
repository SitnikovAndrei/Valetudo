<script setup lang="ts">
import {computed, ref} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {Capability, type ValetudoInformation, type ValetudoDataPoint} from "../api/types";
import {fetchTotalStatistics} from "../api/client";
import {statisticsAchievements} from "../robot/res/StatisticsAchievements";
import {translate} from "../i18n";
import {formatStatisticsValue} from "../statistics";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const supported = computed(() => props.capabilities.includes(Capability.TotalStatistics));
const statistics = useQuery({
    queryKey: ["totalStatistics"],
    queryFn: fetchTotalStatistics,
    enabled: supported
});
const selected = ref<ValetudoDataPoint>();
const sorted = computed(() => [...(statistics.data.value ?? [])].sort((a, b) => ({time: 0, area: 1, count: 2}[a.type] - {time: 0, area: 1, count: 2}[b.type])));

function latest(point: ValetudoDataPoint) {
    return statisticsAchievements[point.type].find(achievement => point.value >= achievement.value);
}

function label(type: ValetudoDataPoint["type"]): string {
    return {count: translate("Cleanups"), time: translate("Cleaning time"), area: translate("Cleaned area")}[type];
}

</script>

<template>
    <section>
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Total statistics") }}</h1>
        <Message v-if="!supported" severity="warn">{{ $t("This robot does not report total statistics.") }}</Message>
        <p v-else-if="statistics.isPending.value" role="status">{{ $t("Loading statistics…") }}</p>
        <div v-else-if="statistics.isError.value" class="panel flex items-center gap-4">
            <Message severity="error">{{ $t("Unable to load total statistics.") }}</Message>
            <Button :label='$t("Retry")' @click="statistics.refetch()" />
        </div>
        <p v-else-if="!statistics.data.value?.length" class="panel muted">{{ $t("No statistics reported.") }}</p>
        <div v-else class="grid gap-4 md:grid-cols-3">
            <div v-for="point in sorted" :key="point.type" class="panel flex flex-col items-start">
                <div class="mb-4 flex h-32 w-32 items-center justify-center self-center rounded-full border-[10px] text-center font-bold" :class="latest(point) ? 'border-amber-400 bg-blue-900 text-amber-300' : 'border-gray-600 bg-gray-800 text-gray-400'">{{ latest(point)?.title ? translate(latest(point)!.title) : '?' }}</div>
                <p class="mb-3 text-sm">{{ latest(point)?.description ? translate(latest(point)!.description) : $t("No achievement yet") }}</p>
                <p class="muted mb-2">{{ label(point.type) }}</p>
                <p class="text-3xl font-bold">{{ formatStatisticsValue(point) }}</p>
                <Button :label='$t("Achievement overview")' text class="mt-3" @click="selected = point" />
            </div>
        </div>
        <Dialog :visible="Boolean(selected)" modal :header="selected ? $t('Achievements for {category}', {category: label(selected.type)}) : ''" class="w-[min(95vw,55rem)]" @update:visible="selected = undefined">
            <div v-if="selected" class="grid max-h-[70vh] gap-3 overflow-auto sm:grid-cols-3">
                <div v-for="achievement in [...statisticsAchievements[selected.type]].reverse()" :key="achievement.value" class="rounded-xl border p-4" style="border-color: var(--app-border)">
                    <strong>{{ selected.value >= achievement.value ? translate(achievement.title) : '?' }}</strong>
                    <p class="muted mt-2 text-sm">{{ selected.value >= achievement.value ? translate(achievement.description) : $t("Not yet achieved") }}</p>
                    <p v-if="selected.value >= achievement.value" class="mt-3 text-sm">{{ $t("Achieved at") }} {{ formatStatisticsValue({...selected, value: achievement.value}) }}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-end"><Button :label='$t("Close")' @click="selected = undefined" /></div>
        </Dialog>
    </section>
</template>
