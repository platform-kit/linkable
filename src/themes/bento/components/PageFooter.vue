<template>
  <footer
    class="mt-6 flex items-center justify-center gap-3 text-center text-xs text-[color:var(--color-ink-soft)]"
  >
    <a
      href="https://github.com/platform-kit/linkable"
      target="_blank"
      rel="noreferrer"
      class="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--glass-2)] px-3 py-1.5 shadow-sm backdrop-blur-md transition hover:bg-[var(--glass)]"
    >
      <span
        class="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)] shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
      ></span>
      <span>Made with Linkable</span>
    </a>
    <a
      v-if="showRss"
      href="/rss.xml"
      target="_blank"
      rel="noreferrer"
      class="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--glass-2)] px-3 py-1.5 shadow-sm backdrop-blur-md transition hover:bg-[var(--glass)]"
      title="RSS Feed"
    >
      <component :is="rssIcon" :size="14" />
      <span>RSS</span>
    </a>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { icons as lucideIcons } from "lucide-vue-next";
export type { PageFooterProps } from "@/lib/component-contracts";

export default defineComponent({
  name: "PageFooter",
  props: {
    showRss: { type: Boolean, default: false },
  },
  setup() {
    const rssIcon = (lucideIcons as Record<string, any>)["Rss"];
    return { rssIcon };
  },
});
</script>
