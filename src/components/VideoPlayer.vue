<template>
  <div
    class="vidstack-wrapper relative w-full overflow-hidden rounded-xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15),0_2px_40px_rgba(255,255,255,0.12),0_4px_80px_rgba(120,160,255,0.10)]"
    style="aspect-ratio: 16/9; max-height: 80vh; max-height: 80dvh;"
  >
    <media-player
      ref="playerEl"
      :src="playerSrc"
      :poster="poster || ''"
      :autoPlay="false"
      load="eager"
      playsInline
      class="vds-video-player"
    >
      <media-provider>
        <media-poster class="vds-poster" />
      </media-provider>
      <media-video-layout />
    </media-player>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";

// Import vidstack custom elements + UI elements + default layout
import "vidstack/player";
import "vidstack/player/ui";
import "vidstack/player/layouts/default";

// Import vidstack CSS
import "vidstack/player/styles/base.css";
import "vidstack/player/styles/default/theme.css";
import "vidstack/player/styles/default/layouts/video.css";

const isYouTubeUrl = (url: string) =>
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(
    url,
  );

export default defineComponent({
  name: "VideoPlayer",
  props: {
    src: { type: String, required: true },
    poster: { type: String, default: "" },
  },
  setup(props, { expose }) {
    const playerEl = ref<HTMLElement | null>(null);

    const playerSrc = computed(() => {
      const s = props.src || "";
      if (isYouTubeUrl(s)) return s;
      if (s.match(/vimeo\.com\/(?:video\/)?\d+/)) return s;
      return s;
    });

    /**
     * Call play() on the underlying <media-player> element.
     * Should be called within a user-gesture context (click/tap handler)
     * so mobile browsers allow playback.
     */
    const play = () => {
      const el = playerEl.value as any;
      if (el?.play) {
        try {
          el.play();
        } catch {
          // swallow — Vidstack will show its play button as fallback
        }
      }
    };

    const pause = () => {
      const el = playerEl.value as any;
      if (el?.pause) {
        try {
          el.pause();
        } catch {
          // swallow
        }
      }
    };

    expose({ play, pause });

    return { playerEl, playerSrc };
  },
});
</script>

<style>
/* Ensure the player fills its container */
.vidstack-wrapper media-player {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
}

.vidstack-wrapper media-player .vds-poster,
.vidstack-wrapper media-player .vds-poster img,
.vidstack-wrapper media-player media-poster,
.vidstack-wrapper media-player media-poster img {
  object-fit: cover !important;
  width: 100% !important;
  height: 100% !important;
}

/*
 * Gesture elements must stay in-layout (so getBoundingClientRect works
 * for Vidstack's hit-testing), but we suppress any visual indicators.
 */
.vidstack-wrapper .vds-gesture,
.vidstack-wrapper media-gesture,
.vidstack-wrapper [data-media-gesture] {
  opacity: 0 !important;
  visibility: hidden !important;
}

/*
 * Force the toggle:paused gesture to show (display:block) on ALL devices,
 * including mobile (pointer:coarse) where Vidstack hides it by default.
 * This makes click/tap anywhere on the video toggle play/pause.
 */
.vidstack-wrapper .vds-gesture[action='toggle:paused'],
.vidstack-wrapper media-gesture[action='toggle:paused'],
.vidstack-wrapper [data-media-gesture][action='toggle:paused'] {
  display: block !important;
}

/*
 * Disable the toggle:controls gesture on ALL devices so it doesn't
 * compete with toggle:paused. We want tap = play/pause, not show/hide controls.
 */
.vidstack-wrapper .vds-gesture[action='toggle:controls'],
.vidstack-wrapper media-gesture[action='toggle:controls'],
.vidstack-wrapper [data-media-gesture][action='toggle:controls'] {
  display: none !important;
}

/*
 * Before the video has started playing, hide the big center play/pause
 * button (which confusingly shows a pause icon after play() is called)
 * and show a loading spinner instead.
 */
.vidstack-wrapper media-player:not([data-started]) .vds-play-button {
  display: none !important;
}

/* Show a CSS spinner in the center before playback starts */
.vidstack-wrapper media-player:not([data-started])::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vp-spin 0.7s linear infinite;
  z-index: 100;
  pointer-events: none;
}

/* Once started, the spinner disappears (::after no longer matches) and
   the play/pause button shows normally for subsequent pause/resume. */

@keyframes vp-spin {
  to { transform: rotate(360deg); }
}
</style>
