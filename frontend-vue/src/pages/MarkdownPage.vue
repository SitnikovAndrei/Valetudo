<script setup lang="ts">
import {computed} from "vue";
import MarkdownIt from "markdown-it";
import {AboutText} from "../valetudo/res/AboutText";
import {HelpText} from "../valetudo/res/HelpText";
import {translate} from "../i18n";
import PageHeader from "../components/PageHeader.vue";

const props = defineProps<{page: "about" | "help"}>();
const renderer = new MarkdownIt({html: true, linkify: true});
const title = computed(() => props.page === "about" ? translate("About Valetudo") : translate("General help"));
const content = computed(() => renderer.render(props.page === "about" ? AboutText : HelpText));
</script>

<template>
    <div class="page max-w-4xl">
        <PageHeader :title="title" />
        <section class="panel"><div class="markdown-content" v-html="content" /></section>
    </div>
</template>
