<template>
  <section class="bento-embed mx-auto w-full" style="max-width: var(--bento-grid-width, 960px)">
    <div v-if="html" class="bento-card overflow-hidden p-4" v-html="sanitizeHtml(html)" />
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { sanitizeHtml } from "../../lib/sanitize-html";
export type { EmbedSectionProps } from "../../lib/component-contracts";

export default defineComponent({
  name: "BentoEmbedSection",
  props: {
    html: { type: String, default: "" },
  },
  setup() {
    return { sanitizeHtml };
  },
});
</script>

<style scoped>
.bento-card {
  background: var(--bento-card-bg, #fff);
  border: 1px solid var(--bento-card-border, transparent);
  border-radius: var(--bento-card-radius, 1.5rem);
  box-shadow: var(--bento-card-shadow, 0 1px 2px rgba(0,0,0,0.04));
}
</style>
