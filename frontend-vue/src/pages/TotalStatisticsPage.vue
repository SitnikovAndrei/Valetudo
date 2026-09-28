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
import PageHeader from "../components/PageHeader.vue";
import AppIcon from "../components/AppIcon.vue";

const props = defineProps<{capabilities: Capability[]; information: ValetudoInformation}>();
const supported = computed(() => props.capabilities.includes(Capability.TotalStatistics));
const statistics = useQuery({
    queryKey: ["totalStatistics"],
    queryFn: fetchTotalStatistics,
    enabled: supported
});
const selected = ref<ValetudoDataPoint>();
const sorted = computed(() => [...(statistics.data.value ?? [])].sort((a, b) => ({time: 0, area: 1, count: 2}[a.type] - {time: 0, area: 1, count: 2}[b.type])));

// Achievements are listed from the largest threshold down.
function latest(point: ValetudoDataPoint) {
    return statisticsAchievements[point.type].find(achievement => point.value >= achievement.value);
}

function next(point: ValetudoDataPoint) {
    return statisticsAchievements[point.type].filter(achievement => achievement.value > point.value).at(-1);
}

/** Share of the way from the latest achievement to the next one, in percent. */
function progress(point: ValetudoDataPoint): number {
    const upcoming = next(point);
    if (!upcoming) return 100;
    const from = latest(point)?.value ?? 0;
    return Math.max(0, Math.min(100, (point.value - from) / (upcoming.value - from) * 100));
}

function label(type: ValetudoDataPoint["type"]): string {
    return {count: translate("Cleanups"), time: translate("Cleaning time"), area: translate("Cleaned area")}[type];
}

</script>

<template>
    <div class="page">
        <PageHeader :title="$t('Total statistics')" />
        <section>
            <Message v-if="!supported" severity="warn">{{ $t("This robot does not report total statistics.") }}</Message>
            <p v-else-if="statistics.isPending.value" role="status">{{ $t("Loading statistics…") }}</p>
            <div v-else-if="statistics.isError.value" class="panel flex items-center gap-4">
                <Message severity="error">{{ $t("Unable to load total statistics.") }}</Message>
                <Button :label='$t("Retry")' @click="statistics.refetch()" />
            </div>
            <p v-else-if="!statistics.data.value?.length" class="panel muted">{{ $t("No statistics reported.") }}</p>
            <div v-else class="grid gap-4 md:grid-cols-3">
                <div v-for="point in sorted" :key="point.type" class="panel stat-card">
                    <p class="muted text-sm">{{ label(point.type) }}</p>
                    <p class="stat-value">{{ formatStatisticsValue(point) }}</p>
                    <div class="stat-achievement">
                        <span class="stat-badge" :class="{'stat-badge--locked': !latest(point)}"><AppIcon name="award" /></span>
                        <span class="min-w-0">
                            <strong class="block">{{ latest(point) ? translate(latest(point)!.title) : $t("No achievement yet") }}</strong>
                            <small v-if="latest(point)" class="muted block">{{ translate(latest(point)!.description) }}</small>
                        </span>
                    </div>
                    <div v-if="next(point)" class="stat-progress">
                        <div class="stat-progress-track" role="progressbar" :aria-valuenow="Math.round(progress(point))" aria-valuemin="0" aria-valuemax="100"><span :style="{width: `${progress(point)}%`}" /></div>
                        <small class="muted">{{ $t("Next achievement at {value}", {value: formatStatisticsValue({...point, value: next(point)!.value})}) }}</small>
                    </div>
                    <button type="button" class="stat-overview" @click="selected = point">{{ $t("Achievement overview") }}<AppIcon name="chevron-right" /></button>
                </div>
            </div>
            <Dialog :visible="Boolean(selected)" modal :header="selected ? $t('Achievements for {category}', {category: label(selected.type)}) : ''" class="w-[min(95vw,55rem)]" @update:visible="selected = undefined">
                <div v-if="selected" class="grid max-h-[70vh] gap-3 overflow-auto sm:grid-cols-3">
                    <div v-for="achievement in [...statisticsAchievements[selected.type]].reverse()" :key="achievement.value" class="achievement-tile" :class="{'achievement-tile--done': selected.value >= achievement.value}">
                        <span class="stat-badge" :class="{'stat-badge--locked': selected.value < achievement.value}"><AppIcon name="award" /></span>
                        <strong class="mt-3 block">{{ selected.value >= achievement.value ? translate(achievement.title) : '?' }}</strong>
                        <p class="muted mt-2 text-sm">{{ selected.value >= achievement.value ? translate(achievement.description) : $t("Not yet achieved") }}</p>
                        <p v-if="selected.value >= achievement.value" class="mt-3 text-sm">{{ $t("Achieved at") }} {{ formatStatisticsValue({...selected, value: achievement.value}) }}</p>
                    </div>
                </div>
                <div class="mt-4 flex justify-end"><Button :label='$t("Close")' @click="selected = undefined" /></div>
            </Dialog>
        </section>
    </div>
</template>

<style scoped>
.stat-card { display: flex; flex-direction: column; gap: 4px; padding: 18px; }
.stat-card p { margin: 0; }
.stat-value { font: 700 var(--text-2xl)/1.2 var(--font-heading); }
.stat-achievement { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--app-border); }
.stat-achievement strong { font-size: var(--text-sm); }
.stat-achievement small { font-size: var(--text-xs); line-height: 1.35; }
.stat-badge { display: grid; flex: none; place-items: center; width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--app-accent-soft); color: var(--app-accent); }
.stat-badge .app-icon { width: 22px; height: 22px; }
.stat-badge--locked { background: var(--app-surface-soft); color: var(--app-muted); }
.stat-progress { display: grid; gap: 6px; margin-top: 12px; }
.stat-progress small { font-size: var(--text-xs); }
.stat-progress-track { overflow: hidden; height: 6px; border-radius: 3px; background: var(--app-surface-soft); }
.stat-progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--app-accent); }
.stat-overview { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin-top: auto; padding: 12px 0 0; border: 0; background: none; color: var(--app-accent); font: inherit; font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
.stat-overview .app-icon { width: 16px; height: 16px; }
.achievement-tile { padding: 16px; border: 1px solid var(--app-border); border-radius: var(--radius-md); }
.achievement-tile--done { border-color: var(--app-accent); }
</style>
