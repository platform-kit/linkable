<template>
  <Teleport to="body">
    <div
      v-if="open && item"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <button
        type="button"
        class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
        @click="$emit('close')"
      >
        <i class="pi pi-times text-lg" />
      </button>
      <div class="relative max-h-[90vh] max-w-[90vw]">
        <img
          :src="resolveUploadUrl(item.src)"
          :alt="item.title || 'Gallery image'"
          class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <div
          v-if="item.title || item.description"
          class="mt-3 max-w-lg text-center"
        >
          <div
            v-if="item.title"
            class="text-sm font-semibold text-white"
          >
            {{ item.title }}
          </div>
          <div
            v-if="item.description"
            class="mt-1 text-xs leading-relaxed text-white/70"
            style="white-space: pre-line"
          >
            {{ item.description }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { GalleryItem } from "@/themes/bento/collection-types";
export type { LightboxOverlayProps, LightboxOverlayEmits } from "@/lib/component-contracts";
import { resolveUploadUrl } from "@/lib/github";

export default defineComponent({
  name: "LightboxOverlay",
  props: {
    open: { type: Boolean, required: true },
    item: { type: Object as PropType<GalleryItem | null>, default: null },
  },
  emits: ["close"],
  setup() {
    return { resolveUploadUrl };
  },
});
</script>
