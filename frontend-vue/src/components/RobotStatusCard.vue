<script setup lang="ts">
import {useQuery} from "@tanstack/vue-query";
import Message from "primevue/message";
import type {Capability} from "../api/types";
import type {BatteryState, RobotAttribute, StatusState} from "../api/RawRobotState";
import {fetchRobotInformation} from "../api/client";
import {valueLabel} from "../i18n/labels";
import HomeDetails from "./HomeDetails.vue";

defineProps<{
    capabilities: Capability[];
    status?: StatusState;
    batteries: BatteryState[];
    attributes: RobotAttribute[];
    attributesPending: boolean;
    attributesError: boolean;
}>();
const robot = useQuery({queryKey: ["robotInformation"], queryFn: fetchRobotInformation, retry: 1});
</script>

<template>
    <div class="panel robot-status">
        <div class="robot-status-heading">
            <span class="kicker">{{ $t("Device") }}</span>
            <span v-if="status" class="status-pill" :class="status.value">{{ valueLabel(status.value) }}</span>
        </div>
        <div class="robot-status-hero">
            <span class="robot-avatar" aria-hidden="true" />
            <div class="min-w-0">
                <p v-if="robot.isPending.value" role="status" class="muted">{{ $t("Loading robot information…") }}</p>
                <p v-else-if="robot.isError.value" role="alert" class="muted">{{ $t("Robot information is unavailable.") }}</p>
                <template v-else>
                    <h2>{{ robot.data.value?.modelName }}</h2>
                    <p class="muted">{{ robot.data.value?.manufacturer }}</p>
                </template>
            </div>
        </div>
        <p v-if="attributesPending" class="muted" role="status">{{ $t("Loading robot state…") }}</p>
        <Message v-else-if="attributesError" severity="error">{{ $t("Unable to load robot state.") }}</Message>
        <dl v-else class="robot-status-facts">
            <div v-for="(battery, index) in batteries" :key="index"><dt>{{ $t("Battery") }}{{ batteries.length > 1 ? ` ${index + 1}` : "" }}</dt><dd>{{ Math.round(battery.level) }}%</dd></div>
            <div v-if="status?.flag && status.flag !== 'none'"><dt>{{ $t("Status") }}</dt><dd>{{ valueLabel(status.flag) }}</dd></div>
        </dl>
        <HomeDetails :capabilities="capabilities" :attributes="attributes" />
    </div>
</template>

<style scoped>
.robot-status { display: grid; gap: 16px; padding: 18px; }
.robot-status-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.robot-status-hero { display: flex; align-items: center; gap: 14px; }
.robot-status-hero h2 { margin: 0 0 2px; font-size: var(--text-lg); }
.robot-status-hero p { margin: 0; font-size: var(--text-sm); }
.robot-avatar { position: relative; flex: none; width: 56px; height: 56px; border: 5px solid var(--app-surface-soft); border-radius: 50%; background: var(--app-surface); box-shadow: 0 4px 15px rgb(0 0 0 / 8%); }
.robot-avatar::before { position: absolute; top: 12px; left: 11px; width: 12px; height: 12px; border: 3px solid var(--app-secondary); border-radius: 50%; content: ""; }
.robot-avatar::after { position: absolute; right: 9px; bottom: 9px; width: 16px; height: 16px; border: 5px solid var(--app-accent); border-radius: 50%; content: ""; }
.robot-status-facts { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 0; }
.robot-status-facts div { display: flex; flex-direction: column-reverse; justify-content: flex-end; gap: 2px; }
.robot-status-facts dt { color: var(--app-muted); font-size: var(--text-xs); }
.robot-status-facts dd { margin: 0; font-size: var(--text-base); font-weight: 700; }
</style>
