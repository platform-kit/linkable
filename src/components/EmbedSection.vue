<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-6">
    <div class="embed-container" v-html="html" />
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export type { EmbedSectionProps } from "../lib/component-contracts";

export default defineComponent({
  name: "EmbedSection",
  props: {
    html: { type: String, required: true },
  },
});
</script>

<style scoped>
.embed-container {
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0px 15px 30px rgba(0, 30, 100, 0.15);
}
</style>
