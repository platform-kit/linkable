<template>
  <div
    class="vidstack-wrapper relative w-full overflow-hidden rounded-xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15),0_2px_40px_rgba(255,255,255,0.12),0_4px_80px_rgba(120,160,255,0.10)]"
    style="aspect-ratio: 16/9; max-height: 80vh; max-height: 80dvh;"
    :data-youtube="isYouTube || undefined"
    :data-vimeo="isVimeo || undefined"
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
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

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

const isVimeoUrl = (url: string) =>
  /vimeo\.com/.test(url) && extractVimeoId(url) !== null;

/**
 * Extract the Vimeo video ID from various URL formats:
 *  - https://vimeo.com/640499893
 *  - https://player.vimeo.com/video/640499893
 *  - https://vimeo.com/showcase/123?video=640499893
 *  - vimeo/640499893
 */
const extractVimeoId = (url: string): string | null => {
  // Showcase URL: ?video=ID
  const showcaseMatch = url.match(/vimeo\.com\/showcase\/\d+.*[?&]video=(\d+)/);
  if (showcaseMatch) return showcaseMatch[1];
  // Standard: vimeo.com/ID or player.vimeo.com/video/ID
  const stdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (stdMatch) return stdMatch[1];
  // Short form: vimeo/ID
  const shortMatch = url.match(/^vimeo\/(\d+)/);
  if (shortMatch) return shortMatch[1];
  return null;
};

export default defineComponent({
  name: "VideoPlayer",
  props: {
    src: { type: String, required: true },
    poster: { type: String, default: "" },
  },
  setup(props, { expose }) {
    const playerEl = ref<HTMLElement | null>(null);

    const isYouTube = computed(() => isYouTubeUrl(props.src || ""));
    const isVimeo = computed(() => isVimeoUrl(props.src || ""));

    const playerSrc = computed(() => {
      const s = props.src || "";
      if (isYouTubeUrl(s)) return s;
      // Normalize any Vimeo URL to https://vimeo.com/{id}
      const vimeoId = extractVimeoId(s);
      if (vimeoId) return `https://vimeo.com/${vimeoId}`;
      return s;
    });

    /** True once the <media-player> has fired its can-play event. */
    const canPlayReady = ref(false);
    /** Resolve this when canPlay fires — used to await readiness. */
    let canPlayResolve: (() => void) | null = null;
    let canPlayPromise: Promise<void> | null = null;

    const resetCanPlay = () => {
      canPlayReady.value = false;
      canPlayPromise = new Promise<void>((resolve) => {
        canPlayResolve = resolve;
      });
    };
    resetCanPlay();

    const markReady = () => {
      if (canPlayReady.value) return;
      canPlayReady.value = true;
      if (canPlayResolve) {
        canPlayResolve();
        canPlayResolve = null;
      }
    };

    /**
     * Attach a native DOM event listener to the <media-player> element.
     * Vue's @can-play does not reliably fire for Lit-based custom elements,
     * so we listen directly on the DOM node.
     */
    const attachCanPlayListener = () => {
      const el = playerEl.value;
      if (!el) return;
      el.addEventListener("can-play", markReady, { once: true });
      // Also check if the element is already ready (e.g. cached / fast load)
      if ((el as any).state?.canPlay || el.hasAttribute("data-can-play")) {
        markReady();
      }
    };

    onMounted(() => {
      attachCanPlayListener();
    });

    // Re-attach if the ref changes (shouldn't normally, but defensive)
    watch(playerEl, () => {
      attachCanPlayListener();
    });

    /**
     * Call play() on the underlying <media-player> element.
     * Waits up to 10 s for the player to become ready (needed for
     * Vimeo / YouTube where the provider is lazy-loaded).
     */
    const play = async () => {
      const el = playerEl.value as any;
      if (!el) return;

      // If the player is not ready yet, wait for can-play (with timeout)
      if (!canPlayReady.value && canPlayPromise) {
        const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10000));
        await Promise.race([canPlayPromise, timeout]);
      }

      // Double-check readiness before calling play
      if (!canPlayReady.value) {
        // Still not ready after timeout — don't throw, let user tap play button
        return;
      }

      if (el.play) {
        try {
          await el.play();
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

    onBeforeUnmount(() => {
      // Clean up listener
      const el = playerEl.value;
      if (el) {
        el.removeEventListener("can-play", markReady);
      }
      // Resolve any pending promise so nothing leaks
      if (canPlayResolve) {
        canPlayResolve();
        canPlayResolve = null;
      }
    });

    expose({ play, pause });

    return { playerEl, playerSrc, isYouTube, isVimeo };
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
 * Hide ALL Vidstack built-in play/pause buttons and buffering indicators.
 * We render our own custom overlays, so these are redundant and cause
 * double-ups (especially the centered play button in data-sm layout).
 */
.vidstack-wrapper .vds-play-button,
.vidstack-wrapper .vds-load-container,
.vidstack-wrapper .vds-buffering-indicator {
  display: none !important;
}

/*
 * Initial loading state: show a spinner inside the same translucent circle
 * used for play/pause overlays. Visible before the video has started.
 */

/* Translucent circle (same style as paused overlay) */
.vidstack-wrapper media-player:not([data-started])::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  z-index: 100;
  pointer-events: none;
}

/* Spinning ring inside the circle */
.vidstack-wrapper media-player:not([data-started])::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vp-spin 0.7s linear infinite;
  z-index: 101;
  pointer-events: none;
}

@keyframes vp-spin {
  to { transform: rotate(360deg); }
}

/*
 * Show a centered play icon overlay when the video is paused AFTER it
 * has started (i.e. user paused mid-playback). Uses a CSS triangle as
 * the play icon inside a translucent circle.
 * Safe for YouTube: Vidstack passes controls=0 to YouTube's iframe,
 * so YouTube's native indicator is fully disabled.
 */
.vidstack-wrapper media-player[data-started][data-paused]::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  z-index: 100;
  pointer-events: none;
}

/* Play triangle inside the circle */
.vidstack-wrapper media-player[data-started][data-paused]::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  /* Triangle: 20px wide, 24px tall, offset slightly right for optical center */
  border-style: solid;
  border-width: 12px 0 12px 20px;
  border-color: transparent transparent transparent #fff;
  transform: translate(calc(-50% + 3px), -50%);
  z-index: 101;
  pointer-events: none;
}

/*
 * Desktop only: show a pause overlay (two vertical bars in a circle)
 * when hovering over a playing video. Uses wrapper's ::after for the
 * circle and ::before for the pause bars (via box-shadow trick).
 */
@media (hover: hover) and (pointer: fine) {
  /* Circle background */
  .vidstack-wrapper:has(media-player[data-started]:not([data-paused]))::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 64px;
    height: 64px;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.55);
    border-radius: 50%;
    z-index: 100;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .vidstack-wrapper:hover:has(media-player[data-started]:not([data-paused]))::after {
    opacity: 1;
  }

  /* Pause icon: two vertical bars using box-shadow on a small element */
  .vidstack-wrapper:has(media-player[data-started]:not([data-paused]))::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 20px;
    /* Left bar is the element itself, right bar is the box-shadow */
    background: #fff;
    box-shadow: 9px 0 0 0 #fff;
    transform: translate(calc(-50% - 4px), -50%);
    border-radius: 1px;
    z-index: 101;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .vidstack-wrapper:hover:has(media-player[data-started]:not([data-paused]))::before {
    opacity: 1;
  }
}
</style>
