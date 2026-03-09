<template>
  <a
    class="card-item group relative flex min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-3 transition sm:gap-3 sm:px-4"
    :href="link.url"
    :target="link.url.startsWith('#') ? '_self' : '_blank'"
    :rel="link.url.startsWith('#') ? undefined : 'noreferrer'"
    @click="$emit('click', link.url, link.title)"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <div
        class="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--glass)] shadow-sm backdrop-blur-md"
      >
        <img
          v-if="link.imageUrl"
          :src="resolveUploadUrl(link.imageUrl)"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
        />
        <i
          v-else
          class="pi pi-link text-[color:var(--color-ink-soft)]"
        />
      </div>

      <div class="min-w-0">
        <div class="truncate text-sm font-semibold">
          {{ link.title }}
        </div>
        <div
          v-if="link.subtitle"
          class="truncate text-xs text-[color:var(--color-ink-soft)]"
        >
          {{ link.subtitle }}
        </div>
      </div>
    </div>

    <i
      class="pi pi-arrow-right shrink-0 text-[color:var(--color-ink-soft)] transition group-hover:translate-x-0.5"
    />
  </a>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { BioLink } from "@/lib/model";
import { resolveUploadUrl } from "@/lib/github";

export default defineComponent({
  name: "LinkCard",
  props: {
    link: { type: Object as PropType<BioLink>, required: true },
  },
  emits: ["click"],
  setup() {
    return { resolveUploadUrl };
  },
});
</script>
