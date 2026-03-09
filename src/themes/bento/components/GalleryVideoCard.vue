<template>
  <button
    type="button"
    class="card-item group relative block h-full w-full overflow-hidden shadow-sm transition"
    @click="$emit('click', item)"
  >
    <img
      v-if="item.coverUrl"
      :src="resolveUploadUrl(item.coverUrl)"
      :alt="item.title || 'Video thumbnail'"
      class="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
      loading="lazy"
    />
    <div
      v-else
      class="absolute inset-0 flex items-center justify-center bg-black/10"
    >
      <i class="pi pi-video text-2xl text-white/60" />
    </div>
    <!-- Play overlay -->
    <div class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-110 sm:h-12 sm:w-12"
      >
        <i class="pi pi-play text-sm sm:text-base" />
      </div>
    </div>
    <div
      v-if="item.title"
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6 sm:px-3 sm:pb-2.5 sm:pt-8"
    >
      <div class="text-[11px] font-semibold text-white/90 sm:text-xs">
        {{ item.title }}
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { GalleryItem } from "@/lib/model";
import { resolveUploadUrl } from "@/lib/github";

export default defineComponent({
  name: "GalleryVideoCard",
  props: {
    item: { type: Object as PropType<GalleryItem>, required: true },
  },
  emits: ["click"],
  setup() {
    return { resolveUploadUrl };
  },
});
</script>
