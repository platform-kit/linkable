<template>
  <div
    v-if="visible"
    class="mb-5 gap-2 mx-auto glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-4 text-center"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition m-[5px]"
      :class="
        activeTab === tab.key
          ? 'tab-active'
          : 'bg-none text-[color:var(--color-ink-soft)] hover:bg-[var(--glass-strong)]'
      "
      @click="$emit('switch', tab.key)"
    >
      <component :is="resolveIcon(tab.icon)" :size="14" class="shrink-0" />
      {{ tab.label }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { icons as lucideIcons } from "lucide-vue-next";
import type { TabItem } from "@/lib/component-contracts";
export type { TabItem };

export default defineComponent({
  name: "TabNav",
  props: {
    visible: { type: Boolean, default: true },
    activeTab: { type: String, required: true },
    tabs: { type: Array as PropType<TabItem[]>, required: true },
  },
  emits: ["switch"],
  setup() {
    const resolveIcon = (name: string) => {
      return (lucideIcons as Record<string, any>)[name] ?? (lucideIcons as Record<string, any>)["Globe"];
    };
    return { resolveIcon };
  },
});
</script>
