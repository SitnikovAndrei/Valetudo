<script setup lang="ts">
import {computed} from "vue";
import MarkdownIt from "markdown-it";
import {AboutText} from "../../../frontend/src/valetudo/res/AboutText";
import {HelpText} from "../../../frontend/src/valetudo/res/HelpText";
import {translate} from "../i18n";

const props = defineProps<{page: "about" | "help"}>();
const renderer = new MarkdownIt({html: true, linkify: true});
const title = computed(() => props.page === "about" ? translate("About Valetudo") : translate("General help"));
const content = computed(() => renderer.render(props.page === "about" ? AboutText : HelpText));
</script>

<template>
    <section class="panel max-w-4xl"><h1 class="mb-6 text-2xl font-bold">{{ title }}</h1><div class="markdown-content" v-html="content" /></section>
</template>
