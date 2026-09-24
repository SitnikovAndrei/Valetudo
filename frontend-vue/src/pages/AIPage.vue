<script setup lang="ts">
import {nextTick, onMounted, ref} from "vue";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import ElizaBot from "eliza-as-promised";
import {filter} from "../valetudo/res/Badwords";
import ValetudoBounce from "../components/ValetudoBounce.vue";
import Woodcock from "../components/Woodcock.vue";
import {aprilFools} from "../aprilFools";

type Message = {sender: "user" | "ai"; text: string};
const bot = new ElizaBot();
const messages = ref<Message[]>([]);
const input = ref("");
const loading = ref(true);
const finished = ref(false);
const showEgg = ref(false);
const end = ref<HTMLElement>();
const field = ref<InstanceType<typeof Textarea>>();

function scroll() {void nextTick(() => end.value?.scrollIntoView({behavior: "smooth", block: "end"}));}
function reset() {
    bot.reset();
    messages.value = [{sender: "ai", text: bot.getInitial()}];
    input.value = "";
    finished.value = false;
    loading.value = false;
    scroll();
}
onMounted(reset);

async function send() {
    const value = filter(input.value).trim();
    if (value.toLowerCase() === "movienight") {showEgg.value = true; input.value = ""; return;}
    if (value.toLowerCase() === "aprilfools") {aprilFools.value = true; input.value = ""; return;}
    if (!value || loading.value || finished.value) return;
    messages.value.push({sender: "user", text: value});
    input.value = "";
    loading.value = true;
    scroll();
    try {
        if (/(woodcock|pe{2,}nt)/i.test(value)) messages.value.push({sender: "ai", text: "woodcock"});
        else {
            const response = await bot.getResponse(value.replace(/\n/g, " "));
            messages.value.push({sender: "ai", text: filter(response.reply || response.final || "I seem to be at a loss for words.")});
            finished.value = Boolean(response.final);
        }
    } catch {
        messages.value.push({sender: "ai", text: "I'm sorry, I'm afraid I can't do that."});
    } finally {
        loading.value = false;
        scroll();
    }
}
function key(event: KeyboardEvent) {if (event.key === "Enter" && !event.shiftKey) {event.preventDefault(); void send();}}
</script>

<template>
    <section class="panel flex h-[70vh] max-h-[90vh] flex-col">
        <h1 class="mb-4 text-2xl font-bold">{{ $t("AI Assistant") }}</h1>
        <div class="flex-1 space-y-3 overflow-y-auto p-2" role="log" aria-live="polite">
            <div v-for="(message, index) in messages" :key="index" class="flex" :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"><p class="max-w-[75%] rounded-2xl p-3 whitespace-pre-wrap" :style="{background: message.sender === 'user' ? 'var(--app-accent)' : 'var(--app-bg)', color: message.sender === 'user' ? 'white' : 'var(--app-text)'}"><Woodcock v-if="/(woodcock|pe{2,}nt)/i.test(message.text)" :facing="message.sender === 'user' ? 'left' : 'right'" />{{ /(woodcock|pe{2,}nt)/i.test(message.text) ? '' : message.text }}</p></div>
            <p v-if="loading" class="muted">{{ $t("Thinking…") }}</p><div ref="end" />
        </div>
        <div class="mt-3 flex items-end gap-2 border-t pt-3" style="border-color: var(--app-border)"><Textarea ref="field" v-model="input" class="flex-1" rows="2" :disabled="finished" :placeholder="finished ? $t('Session ended. Start a new one?') : $t('Tell me about your problems…')" @keydown="key" /><Button :label="finished ? $t('Restart') : $t('Send')" :disabled="!finished && (loading || !input.trim())" @click="finished ? reset() : send()" /></div>
        <ValetudoBounce v-if="showEgg" @close="showEgg = false" />
    </section>
</template>
