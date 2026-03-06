<template>
  <Teleport to="body">
    <div
      v-show="open"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4"
      @click.self="$emit('close')"
    >
      <button
        type="button"
        class="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 sm:right-4 sm:top-4"
        @click="$emit('close')"
      >
        <i class="pi pi-times text-lg" />
      </button>
      <div class="relative w-full max-w-4xl" style="max-height: 85vh; max-height: 85dvh; max-width: min(56rem, calc((85dvh - 3rem) * 16 / 9));">
        <div
          v-for="(vItem, vIdx) in videoItems"
          :key="vItem.src"
          v-show="activeIndex === vIdx"
        >
          <VideoPlayer
            :ref="(el: any) => $emit('set-ref', vIdx, el)"
            :src="resolveUploadUrl(vItem.src)"
            :poster="vItem.coverUrl ? resolveUploadUrl(vItem.coverUrl) : ''"
          />
        </div>
        <div v-if="activeItem?.title || activeItem?.description" class="mt-3 max-w-lg mx-auto text-center">
          <div
            v-if="activeItem?.title"
            class="text-sm font-semibold text-white"
          >
            {{ activeItem.title }}
          </div>
          <div
            v-if="activeItem?.description"
            class="mt-1 text-xs leading-relaxed text-white/70"
            style="white-space: pre-line"
          >
            {{ activeItem.description }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { GalleryItem } from "../lib/model";
export type { VideoOverlayProps, VideoOverlayEmits } from "../lib/component-contracts";
import VideoPlayer from "./VideoPlayer.vue";
import { resolveUploadUrl } from "../lib/github";

export default defineComponent({
  name: "VideoOverlay",
  components: { VideoPlayer },
  props: {
    open: { type: Boolean, required: true },
    videoItems: { type: Array as PropType<GalleryItem[]>, required: true },
    activeIndex: { type: Number as PropType<number | null>, default: null },
    activeItem: { type: Object as PropType<GalleryItem | null>, default: null },
  },
  emits: ["close", "set-ref"],
  setup() {
    return { resolveUploadUrl };
  },
});
</script>
