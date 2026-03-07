<template>
  <section class="space-y-4">
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

      <div v-if="filtered.length === 0" class="py-8 text-center text-sm text-[color:var(--color-ink-soft)]">
        {{ searchQuery.trim() ? 'No matching posts.' : 'No posts yet.' }}
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="post in filtered"
          :key="post.slug"
          type="button"
          class="group flex w-full items-center gap-3 rounded-lg bg-[rgba(0,50,100,0.0625)] px-3 py-3.5 text-left transition hover:opacity-80 sm:py-4"
          @click="$emit('load-post', post.slug)"
        >
          <img
            v-if="post.coverImage"
            :src="post.coverImage"
            alt=""
            class="h-9 w-9 shrink-0 rounded-lg border border-transparent dark-border-subtle object-cover sm:h-10 sm:w-10"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-[color:var(--color-ink)]">
              {{ post.title }}
            </div>
            <div class="mt-0.5 truncate text-xs text-[color:var(--color-ink-soft)]">
              {{ formatDate(post.date) }}<template v-if="post.excerpt"> · {{ post.excerpt }}</template>
            </div>
          </div>
          <svg
            class="h-4 w-4 shrink-0 text-[color:var(--color-ink-soft)] transition group-hover:translate-x-0.5"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from "vue";
import type { BlogPostMeta, BlogPost } from "../../lib/blog";
export type { BlogSectionProps, BlogSectionEmits } from "../../lib/component-contracts";
import SearchBar from "../../components/SearchBar.vue";
import BlogPostView from "../../components/BlogPostView.vue";

export default defineComponent({
  name: "MinimalBlogSection",
  components: { SearchBar, BlogPostView },
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

    const formatDate = (d: string) => {
      if (!d) return "";
      try {
        return new Date(d).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return d;
      }
    };

    return { searchQuery, filtered, formatDate };
  },
});
</script>
