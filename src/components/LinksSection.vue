<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-4">
    <SearchBar
      v-if="searchEnabled && links.length > 0"
      v-model="searchQuery"
      placeholder="Search links…"
      :show-search="searchEnabled"
      :tag-count="availableTags.length > 0 ? availableTags.length : null"
      :selected-tag-count="selectedTags.length"
      @filter-click="$emit('filter-click')"
    />

    <div v-if="filtered.length" class="grid gap-2">
      <LinkCard
        v-for="link in filtered"
        :key="link.id"
        :link="link"
        @click="(url: string, title: string) => $emit('link-click', url, title)"
      />
    </div>

    <div v-else class="p-6 text-center">
      <div class="text-sm font-semibold">No links yet</div>
      <div class="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        Open the CMS and add your first button.
      </div>
      <slot name="empty-action" />
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from "vue";
import type { BioLink } from "../lib/model";
export type { LinksSectionProps, LinksSectionEmits } from "../lib/component-contracts";
import SearchBar from "./SearchBar.vue";
import LinkCard from "./LinkCard.vue";

export default defineComponent({
  name: "LinksSection",
  components: { SearchBar, LinkCard },
  props: {
    links: { type: Array as PropType<BioLink[]>, required: true },
    searchEnabled: { type: Boolean, default: false },
    availableTags: { type: Array as PropType<string[]>, default: () => [] },
    selectedTags: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["link-click", "filter-click"],
  setup(props) {
    const searchQuery = ref("");

    const filtered = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      const tags = props.selectedTags;
      let source = props.links;
      if (q) {
        source = source.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.subtitle.toLowerCase().includes(q) ||
            l.url.toLowerCase().includes(q) ||
            l.tags?.some((t) => t.toLowerCase().includes(q)),
        );
      }
      if (tags.length > 0) {
        source = source.filter(
          (l) => l.tags && tags.some((t) => l.tags.includes(t)),
        );
      }
      return source;
    });

    return { searchQuery, filtered };
  },
});
</script>
