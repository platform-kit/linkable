<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-6">
    <NewsletterSignup />
    <SearchBar
      v-if="searchEnabled || availableTags.length > 0"
      v-model="searchQuery"
      placeholder="Search..."
      :show-search="searchEnabled"
      :tag-count="availableTags.length > 0 ? availableTags.length : null"
      :selected-tag-count="selectedTags.length"
      @filter-click="$emit('filter-click')"
    />
    <NewsletterArchive
      :search-query="searchQuery"
      :selected-tags="selectedTags"
      @view="(id: string) => $emit('view', id)"
      @tags-loaded="(tags: string[]) => $emit('tags-loaded', tags)"
    />
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from "vue";
export type { NewsletterSectionProps, NewsletterSectionEmits } from "../lib/component-contracts";
import SearchBar from "./SearchBar.vue";
import NewsletterSignup from "./NewsletterSignup.vue";
import NewsletterArchive from "./NewsletterArchive.vue";

export default defineComponent({
  name: "NewsletterSection",
  components: { SearchBar, NewsletterSignup, NewsletterArchive },
  props: {
    searchEnabled: { type: Boolean, default: false },
    availableTags: { type: Array as PropType<string[]>, default: () => [] },
    selectedTags: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["view", "tags-loaded", "filter-click"],
  setup() {
    const searchQuery = ref("");
    return { searchQuery };
  },
});
</script>
