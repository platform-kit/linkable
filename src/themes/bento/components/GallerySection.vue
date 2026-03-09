<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-6">
    <SearchBar
      v-if="searchEnabled || availableTags.length > 0"
      v-model="searchQuery"
      placeholder="Search gallery…"
      :show-search="searchEnabled"
      :tag-count="availableTags.length > 0 ? availableTags.length : null"
      :selected-tag-count="selectedTags.length"
      @filter-click="$emit('filter-click')"
    />

    <MasonryGrid
      :items="filteredItems"
      :gap="12"
      :duration="0.6"
      :stagger="0.04"
      animate-from="bottom"
      :scale-on-hover="true"
      :hover-scale="0.97"
    >
      <template #default="{ item }">
        <GalleryImageCard
          v-if="item.type === 'image'"
          :item="item"
          @click="$emit('open-lightbox', $event)"
        />
        <GalleryVideoCard
          v-else-if="item.type === 'video'"
          :item="item"
          @click="$emit('open-video', $event)"
        />
      </template>
    </MasonryGrid>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from "vue";
import type { MasonryItem } from "./MasonryGrid.vue";
export type { GallerySectionProps, GallerySectionEmits } from "@/lib/component-contracts";
import SearchBar from "./SearchBar.vue";
import MasonryGrid from "./MasonryGrid.vue";
import GalleryImageCard from "./GalleryImageCard.vue";
import GalleryVideoCard from "./GalleryVideoCard.vue";

export default defineComponent({
  name: "GallerySection",
  components: { SearchBar, MasonryGrid, GalleryImageCard, GalleryVideoCard },
  props: {
    items: { type: Array as PropType<MasonryItem[]>, required: true },
    searchEnabled: { type: Boolean, default: false },
    availableTags: { type: Array as PropType<string[]>, default: () => [] },
    selectedTags: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["open-lightbox", "open-video", "filter-click"],
  setup(props) {
    const searchQuery = ref("");

    const filteredItems = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      const tags = props.selectedTags;
      let source = props.items;
      if (q) {
        source = source.filter(
          (item) =>
            (item.title as string || "").toLowerCase().includes(q) ||
            (item.description as string || "").toLowerCase().includes(q),
        );
      }
      if (tags.length > 0) {
        source = source.filter(
          (item) => (item as any).tags && tags.some((t: string) => (item as any).tags.includes(t)),
        );
      }
      return source;
    });

    return { searchQuery, filteredItems };
  },
});
</script>
