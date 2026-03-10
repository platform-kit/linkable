<template>
  <button
    type="button"
    class="card-item group relative block h-full w-full overflow-hidden shadow-sm transition"
    @click="$emit('click', item)"
  >
    <img
      :src="resolveUploadUrl(item.src)"
      :alt="item.title || 'Gallery image'"
      class="h-full w-full object-cover transition group-hover:scale-[1.02]"
      loading="lazy"
    />
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
import type { GalleryItem } from "@/themes/bento/collection-types";
import { resolveUploadUrl } from "@/lib/github";

export default defineComponent({
  name: "GalleryImageCard",
  props: {
    item: { type: Object as PropType<GalleryItem>, required: true },
  },
  emits: ["click"],
  setup() {
    return { resolveUploadUrl };
  },
});
</script>
