<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import {fetchHTTPBasicAuthConfiguration, sendHTTPBasicAuthConfiguration} from "../api/client";
import type {HTTPBasicAuthConfiguration} from "../api/types";

const queryClient = useQueryClient();
const config = useQuery({queryKey: ["httpAuth"], queryFn: fetchHTTPBasicAuthConfiguration});
const draft = ref<HTTPBasicAuthConfiguration>({enabled: false, username: "", password: ""});
watch(config.data, value => {if (value) draft.value = {...value};}, {immediate: true});
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(config.data.value));
const save = useMutation({mutationFn: sendHTTPBasicAuthConfiguration, onSuccess: async () => {await queryClient.invalidateQueries({queryKey: ["httpAuth"]});}});
</script>

<template>
    <section class="panel max-w-2xl">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("HTTP Basic Auth") }}</h1>
        <p v-if="config.isPending.value" role="status">{{ $t("Loading configuration…") }}</p>
        <Message v-else-if="config.isError.value" severity="error">{{ $t("Configuration unavailable.") }} <Button :label='$t("Retry")' text @click="config.refetch()" /></Message>
        <form v-else class="flex flex-col gap-4" @submit.prevent="save.mutate({...draft})">
            <label class="flex items-center gap-2"><Checkbox v-model="draft.enabled" binary /> {{ $t("HTTP Basic Auth enabled") }}</label>
            <label class="flex flex-col gap-1">{{ $t("Username") }} <InputText v-model="draft.username" :disabled="!draft.enabled" autocomplete="username" /></label>
            <label class="flex flex-col gap-1">{{ $t("Password") }} <Password v-model="draft.password" :disabled="!draft.enabled" :feedback="false" toggle-mask autocomplete="new-password" /></label>
            <Message severity="info">{{ $t("Valetudo blocks access from public IP addresses by default. Use a VPN or a hardened reverse proxy for remote access.") }}</Message>
            <Message v-if="save.isError.value" severity="error">{{ $t("Unable to save configuration.") }}</Message>
            <Button type="submit" :label='$t("Save configuration")' :disabled="!dirty || save.isPending.value" :loading="save.isPending.value" />
        </form>
    </section>
</template>
