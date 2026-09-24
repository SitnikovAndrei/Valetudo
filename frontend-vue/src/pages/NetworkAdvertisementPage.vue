<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import {fetchNetworkAdvertisementConfiguration, fetchNetworkAdvertisementProperties, sendNetworkAdvertisementConfiguration} from "../api/client";

const queryClient = useQueryClient();
const config = useQuery({queryKey: ["networkAdvertisement"], queryFn: fetchNetworkAdvertisementConfiguration});
const properties = useQuery({queryKey: ["networkAdvertisementProperties"], queryFn: fetchNetworkAdvertisementProperties});
const enabled = ref(false);
watch(config.data, value => {if (value) enabled.value = value.enabled;}, {immediate: true});
const dirty = computed(() => enabled.value !== config.data.value?.enabled);
const save = useMutation({mutationFn: sendNetworkAdvertisementConfiguration, onSuccess: () => queryClient.invalidateQueries({queryKey: ["networkAdvertisement"]})});
</script>

<template>
    <section class="panel max-w-2xl">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Network advertisement") }}</h1>
        <p v-if="config.isPending.value || properties.isPending.value" role="status">{{ $t("Loading configuration…") }}</p>
        <Message v-else-if="config.isError.value || properties.isError.value" severity="error">{{ $t("Configuration unavailable.") }} <Button :label='$t("Retry")' text @click="config.refetch(); properties.refetch()" /></Message>
        <template v-else>
            <p class="mb-4">{{ $t("Host:") }} {{ properties.data.value?.zeroconfHostname }} · {{ $t("Port:") }} {{ properties.data.value?.port }}</p>
            <label class="flex items-center gap-2"><Checkbox v-model="enabled" binary /> {{ $t("Enable network advertisement") }}</label>
            <Message v-if="save.isError.value" severity="error" class="mt-4">{{ $t("Unable to save configuration.") }}</Message>
            <Button :label='$t("Save configuration")' class="mt-5" :disabled="!dirty || save.isPending.value" :loading="save.isPending.value" @click="save.mutate({enabled})" />
        </template>
    </section>
</template>
