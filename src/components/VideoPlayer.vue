<template>
  <div
    class="vidstack-wrapper relative w-full rounded-xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15),0_2px_40px_rgba(255,255,255,0.12),0_4px_80px_rgba(120,160,255,0.10)]"
    style="aspect-ratio: 16/9; max-height: 80vh; max-height: 80dvh;"
  >
    <media-player
      ref="playerEl"
      :src="playerSrc"
      :poster="poster || ''"
      :autoPlay="shouldAutoplay"
      load="idle"
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
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";

// Import vidstack custom elements + UI elements + default layout
import "vidstack/player";
import "vidstack/player/ui";
import "vidstack/player/layouts/default";

// Import vidstack CSS
import "vidstack/player/styles/base.css";
import "vidstack/player/styles/default/theme.css";
import "vidstack/player/styles/default/layouts/video.css";

const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const isYouTubeUrl = (url: string) =>
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(
    url,
  );

export default defineComponent({
  name: "VideoPlayer",
  props: {
    src: { type: String, required: true },
    poster: { type: String, default: "" },
    autoplay: { type: Boolean, default: true },
  },
  setup(props) {
    const playerEl = ref<HTMLElement | null>(null);

    /**
     * On mobile, YouTube embeds often stay in the "unstarted" state and never
     * fire the Cued → can-play sequence that Vidstack expects. Autoplay then
     * causes Vidstack's invalidPlay loop to lock the player up. Disabling
     * autoplay on mobile lets the user tap Vidstack's play button, providing
     * the user-gesture context YouTube requires.
     */
    const isEmbedSrc = computed(() => isYouTubeUrl(props.src || ""));
    const shouldAutoplay = computed(
      () => props.autoplay && !(isMobile && isEmbedSrc.value),
    );

    const playerSrc = computed(() => {
      const s = props.src || "";

      // YouTube — pass the full URL; vidstack handles it natively
      if (isYouTubeUrl(s)) return s;

      // Vimeo — pass the full URL
      if (s.match(/vimeo\.com\/(?:video\/)?\d+/)) return s;

      // Direct video URL (mp4 etc.)
      return s;
    });

    /**
     * Mobile recovery: YouTube's IFrame API handshake relies on a single
     * postMessage({ event: "listening" }) sent 100 ms after the iframe's
     * load event. On slower mobile CPUs/connections that 100 ms can be too
     * short — YouTube hasn't finished initialising its message listener yet,
     * so the handshake never completes and the player hangs.
     *
     * We periodically re-send the "listening" message until Vidstack sets
     * the `can-play` attribute (indicating the handshake succeeded).
     */
    let retryTimer: ReturnType<typeof setInterval> | undefined;

    const startRetry = () => {
      stopRetry();
      if (!isMobile || !isEmbedSrc.value) return;

      let attempts = 0;
      const MAX = 15; // up to ~15 s
      retryTimer = setInterval(() => {
        const el = playerEl.value;
        if (!el || attempts >= MAX) {
          stopRetry();
          return;
        }
        // Vidstack reflects can-play as a boolean attribute on <media-player>
        if (el.hasAttribute("can-play")) {
          stopRetry();
          return;
        }
        attempts++;
        const iframe = el.querySelector("iframe") as HTMLIFrameElement | null;
        if (iframe?.contentWindow) {
          try {
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: "listening" }),
              "*",
            );
          } catch {
            // cross-origin postMessage can throw in edge cases — ignore
          }
        }
      }, 1000);
    };

    const stopRetry = () => {
      if (retryTimer !== undefined) {
        clearInterval(retryTimer);
        retryTimer = undefined;
      }
    };

    onMounted(() => startRetry());
    onUnmounted(() => stopRetry());

    // Restart retry when src changes (user picks a different video)
    watch(() => props.src, () => startRetry());

    return { playerEl, playerSrc, shouldAutoplay };
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
 * On mobile, Vidstack inserts a .vds-blocker div over YouTube/Vimeo iframes
 * to intercept clicks. If the YouTube API handshake hasn't completed yet the
 * player is stuck in a loading state and the blocker prevents the user from
 * tapping YouTube's native play button. We make the blocker pass-through
 * until the player signals it can play.
 */
@media (hover: none) and (pointer: coarse) {
  media-player:not([can-play]) .vds-blocker {
    pointer-events: none !important;
  }

  /* Ensure the YouTube iframe is interactable while Vidstack hasn't loaded */
  media-player:not([can-play]) iframe {
    pointer-events: auto !important;
    position: relative;
    z-index: 1;
  }
}
</style>
