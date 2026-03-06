<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-6">
    <!-- Blog post detail view -->
    <template v-if="currentPost">
      <BlogPostView :post="currentPost" @back="$emit('back')" />
    </template>

    <!-- Blog listing -->
    <template v-else>
      <SearchBar
        v-if="(searchEnabled || availableTags.length > 0) && posts.length > 0"
        v-model="searchQuery"
        placeholder="Search posts…"
        :show-search="searchEnabled"
        :tag-count="availableTags.length > 0 ? availableTags.length : null"
        :selected-tag-count="selectedTags.length"
        @filter-click="$emit('filter-click')"
      />

      <h2
        class="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-4 sm:text-xs"
      >
        {{ label }}
      </h2>

      <div v-if="filtered.length === 0" class="py-6 text-center text-sm text-[color:var(--color-ink-soft)]">
        {{ searchQuery.trim() ? 'No matching posts.' : 'No posts yet.' }}
      </div>

      <div v-else class="grid gap-3">
        <BlogPostCard
          v-for="post in filtered"
          :key="post.slug"
          :post="post"
          @click="(slug: string) => $emit('load-post', slug)"
        />
      </div>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from "vue";
import type { BlogPostMeta, BlogPost } from "../lib/blog";
export type { BlogSectionProps, BlogSectionEmits } from "../lib/component-contracts";
import SearchBar from "./SearchBar.vue";
import BlogPostView from "./BlogPostView.vue";
import BlogPostCard from "./BlogPostCard.vue";

export default defineComponent({
  name: "BlogSection",
  components: { SearchBar, BlogPostView, BlogPostCard },
  props: {
    posts: { type: Array as PropType<BlogPostMeta[]>, required: true },
    currentPost: { type: Object as PropType<BlogPost | null>, default: null },
    label: { type: String, default: "Blog" },
    searchEnabled: { type: Boolean, default: false },
    availableTags: { type: Array as PropType<string[]>, default: () => [] },
    selectedTags: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["load-post", "back", "filter-click"],
  setup(props) {
    const searchQuery = ref("");

    const filtered = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      const tags = props.selectedTags;
      let source = props.posts;
      if (q) {
        source = source.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.excerpt?.toLowerCase().includes(q)) ||
            p.tags?.some((t) => t.toLowerCase().includes(q)),
        );
      }
      if (tags.length > 0) {
        source = source.filter(
          (p) => p.tags && tags.some((t) => p.tags!.includes(t)),
        );
      }
      return source;
    });

    return { searchQuery, filtered };
  },
});
</script>
