<script setup lang="ts">
import {computed} from "vue";
import {useQuery} from "@tanstack/vue-query";
import Button from "primevue/button";
import Message from "primevue/message";
import {fetchRobotInformation, fetchRobotProperties, fetchSystemHostInfo, fetchSystemRuntimeInfo, fetchValetudoInformation, fetchValetudoVersionInformation} from "../../../frontend/src/api/client";
import {translate} from "../i18n";

const robot = useQuery({queryKey: ["robotInformation"], queryFn: fetchRobotInformation});
const properties = useQuery({queryKey: ["robotProperties"], queryFn: fetchRobotProperties});
const valetudo = useQuery({queryKey: ["valetudoInformation"], queryFn: fetchValetudoInformation});
const version = useQuery({queryKey: ["valetudoVersion"], queryFn: fetchValetudoVersionInformation});
const host = useQuery({queryKey: ["systemHost"], queryFn: fetchSystemHostInfo});
const runtime = useQuery({queryKey: ["systemRuntime"], queryFn: fetchSystemRuntimeInfo});
const details = computed(() => [
    [translate("Manufacturer"), robot.data.value?.manufacturer], [translate("Model"), robot.data.value?.modelName],
    [translate("Implementation"), robot.data.value?.implementation], [translate("Firmware"), properties.data.value?.firmwareVersion],
    [translate("System ID"), valetudo.data.value?.systemId], [translate("Valetudo release"), version.data.value?.release],
    [translate("Valetudo commit"), version.data.value?.commit]
].filter(([, value]) => value !== undefined));
</script>

<template>
    <section class="grid gap-5 md:grid-cols-2">
        <h1 class="text-2xl font-bold md:col-span-2">{{ $t("System information") }}</h1>
        <div class="panel">
            <h2 class="mb-3 text-xl font-semibold">{{ $t("Robot and Valetudo") }}</h2>
            <p v-if="robot.isPending.value || valetudo.isPending.value" role="status">{{ $t("Loading…") }}</p>
            <Message v-if="robot.isError.value || valetudo.isError.value" severity="error">{{ $t("Information unavailable.") }}</Message>
            <dl class="grid grid-cols-2 gap-3"><template v-for="[label, value] in details" :key="label"><dt class="muted">{{ label }}</dt><dd class="break-all">{{ value }}</dd></template></dl>
        </div>
        <div class="panel">
            <div class="mb-3 flex items-center justify-between"><h2 class="text-xl font-semibold">{{ $t("Host") }}</h2><Button :label='$t("Refresh")' text @click="host.refetch()" /></div>
            <p v-if="host.isPending.value" role="status">{{ $t("Loading…") }}</p>
            <Message v-else-if="host.isError.value" severity="error">{{ $t("Host information unavailable.") }}</Message>
            <dl v-else class="grid grid-cols-2 gap-3">
                <dt class="muted">{{ $t("Hostname") }}</dt><dd>{{ host.data.value?.hostname }}</dd>
                <dt class="muted">{{ $t("Architecture") }}</dt><dd>{{ host.data.value?.arch }}</dd>
                <dt class="muted">{{ $t("Uptime") }}</dt><dd>{{ host.data.value?.uptime }} s</dd>
                <dt class="muted">{{ $t("Free memory") }}</dt><dd>{{ ((host.data.value?.mem.free ?? 0) / 1048576).toFixed(1) }} MiB</dd>
                <dt class="muted">{{ $t("Valetudo memory") }}</dt><dd>{{ ((host.data.value?.mem.valetudo_current ?? 0) / 1048576).toFixed(1) }} MiB</dd>
            </dl>
        </div>
        <div class="panel md:col-span-2">
            <div class="mb-3 flex items-center justify-between"><h2 class="text-xl font-semibold">{{ $t("Runtime") }}</h2><Button :label='$t("Refresh")' text @click="runtime.refetch()" /></div>
            <p v-if="runtime.isPending.value" role="status">{{ $t("Loading…") }}</p>
            <Message v-else-if="runtime.isError.value" severity="error">{{ $t("Runtime information unavailable.") }}</Message>
            <template v-else>
                <dl class="grid gap-2 sm:grid-cols-2"><div>{{ $t("Uptime:") }} {{ runtime.data.value?.uptime }} s</div><div>PID: {{ runtime.data.value?.pid }}</div><div>UID: {{ runtime.data.value?.uid }}</div><div>GID: {{ runtime.data.value?.gid }}</div><div>{{ $t("Generation:") }} {{ runtime.data.value?.phoenix.generation }}</div></dl>
                <details class="mt-4"><summary>{{ $t("Node versions") }}</summary><dl class="mt-2 grid grid-cols-2 gap-2"><template v-for="(value, key) in runtime.data.value?.versions" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></details>
                <details class="mt-4"><summary>{{ $t("Environment") }}</summary><dl class="mt-2 grid grid-cols-2 gap-2 break-all"><template v-for="(value, key) in runtime.data.value?.env" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></details>
            </template>
        </div>
    </section>
</template>
