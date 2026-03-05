<template>
  <div class="relative w-full" style="aspect-ratio: 16/9;">
    <!-- Direct mp4 -->
    <video
      v-if="isMp4"
      controls
      :autoplay="autoplay"
      :poster="poster || undefined"
      class="h-full w-full rounded-lg object-contain shadow-2xl"
      style="background: #000;"
    >
      <source :src="src" type="video/mp4" />
    </video>
    <!-- YouTube / Vimeo embed -->
    <iframe
      v-else-if="embedUrl"
      :src="embedUrl"
      class="h-full w-full rounded-lg shadow-2xl"
      style="border: 0;"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
    />
    <!-- Unsupported -->
    <div
      v-else
      class="flex h-full w-full items-center justify-center rounded-lg bg-black/50 text-sm text-white/60"
    >
      Unsupported video source
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";

export default defineComponent({
  name: "VideoPlayerBasic",
  props: {
    src: { type: String, required: true },
    poster: { type: String, default: "" },
    autoplay: { type: Boolean, default: true },
  },
  setup(props) {
    const isMp4 = computed(() => !!props.src.match(/\.mp4(\?|$)/i));

    const embedUrl = computed((): string | null => {
      if (!props.src) return null;
      // YouTube
      const ytMatch = props.src.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
      // Vimeo — showcase URL with ?video=ID
      const vmShowcaseMatch = props.src.match(/vimeo\.com\/showcase\/\d+.*[?&]video=(\d+)/);
      if (vmShowcaseMatch) return `https://player.vimeo.com/video/${vmShowcaseMatch[1]}?autoplay=1&muted=0`;
      // Vimeo — standard URL
      const vmMatch = props.src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=0`;
      // Direct mp4 handled separately
      if (isMp4.value) return null;
      return null;
    });

    return { isMp4, embedUrl };
  },
});
</script>
