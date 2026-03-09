<template>
  <div v-if="loading" class="flex items-center justify-center py-8">
    <i class="pi pi-spin pi-spinner text-lg text-[color:var(--color-ink-soft)]" />
  </div>

  <div v-else-if="filteredSends.length" class="mt-6">
    <h3 class="mb-3 text-sm font-bold uppercase tracking-widest text-[color:var(--color-ink-soft)]">
      Past Issues
    </h3>

    <div class="flex flex-col gap-3">
      <button
        v-for="send in filteredSends"
        :key="send.id"
        type="button"
        class="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--glass-2)] p-4 text-left transition hover:bg-[var(--glass)] card-item"
        @click="$emit('view', send.id)"
      >
        <img
          v-if="send.cover_image"
          :src="send.cover_image"
          alt=""
          class="h-16 w-16 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
          loading="lazy"
        />
        <div class="min-w-0 flex-1 flex flex-col gap-1">
          <span class="text-sm font-semibold text-[color:var(--color-ink)] ">
            {{ send.subject }}
          </span>
          <span class="text-[11px] font-medium uppercase tracking-widest text-[color:var(--color-ink-soft)]">
            {{ formatDate(send.sent_at) }}
          </span>
          <span
            v-if="excerptText(send.excerpt_html)"
            class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[color:var(--color-ink-soft)]"
          >
            {{ excerptText(send.excerpt_html) }}
          </span>
          <div v-if="send.tags && send.tags.length" class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="tag in send.tags"
              :key="tag"
              class="inline-block rounded-full border border-[var(--color-border)] bg-[var(--glass)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-ink-soft)]"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </div>

  <div v-else-if="sends.length && !filteredSends.length" class="mt-6">
    <p class="text-center text-sm text-[color:var(--color-ink-soft)]">No matching newsletters found.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from "vue";

interface SendSummary {
  id: string;
  subject: string;
  cover_image: string;
  excerpt_html: string;
  tags: string[];
  sent_at: string;
}

export default defineComponent({
  name: "NewsletterArchive",
  props: {
    searchQuery: { type: String, default: "" },
    selectedTags: { type: Array as () => string[], default: () => [] },
  },
  emits: ["view", "tags-loaded"],
  setup(props, { emit }) {
    const sends = ref<SendSummary[]>([]);
    const loading = ref(true);

    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

    const availableTags = computed(() => {
      const tagSet = new Set<string>();
      for (const s of sends.value) {
        if (s.tags) s.tags.forEach((t) => tagSet.add(t));
      }
      return [...tagSet].sort();
    });

    watch(availableTags, (tags) => {
      emit("tags-loaded", tags);
    });

    const filteredSends = computed(() => {
      const q = props.searchQuery.trim().toLowerCase();
      const tags = props.selectedTags;
      let source = sends.value;
      if (q) {
        source = source.filter(
          (s) =>
            s.subject.toLowerCase().includes(q) ||
            (s.excerpt_html && excerptText(s.excerpt_html).toLowerCase().includes(q)) ||
            s.tags?.some((t) => t.toLowerCase().includes(q)),
        );
      }
      if (tags.length > 0) {
        source = source.filter(
          (s) => s.tags && tags.some((t) => s.tags.includes(t)),
        );
      }
      return source;
    });

    async function fetchSends() {
      loading.value = true;
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/newsletter-view`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${anonKey}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          sends.value = data.map((s: any) => ({
            ...s,
            tags: Array.isArray(s.tags) ? s.tags : [],
          }));
        }
      } catch {
        // silent — archive is non-critical
      } finally {
        loading.value = false;
      }
    }

    function formatDate(iso: string): string {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    function excerptText(html: string): string {
      if (!html) return "";
      const text = html.replace(/<[^>]*>/g, "").trim();
      return text;
    }

    onMounted(fetchSends);

    return { sends, filteredSends, loading, formatDate, excerptText };
  },
});
</script>
