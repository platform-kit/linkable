<template>
  <div
    class="vidstack-wrapper relative w-full overflow-hidden rounded-xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15),0_2px_40px_rgba(255,255,255,0.12),0_4px_80px_rgba(120,160,255,0.10)]"
    style="aspect-ratio: 16/9; max-height: 80vh; max-height: 80dvh;"
  >
    <media-player
      ref="playerEl"
      :src="playerSrc"
      :poster="poster || ''"
      :autoPlay="autoplay"
      load="eager"
      playsInline
      class="vds-video-player"
    >
      <media-provider>
        <media-poster class="vds-poster" />
      </media-provider>
      <media-video-layout />
    </media-player>

    <!-- Tap-to-play fallback overlay (mobile only, shown when autoplay hangs) -->
    <Transition name="fade-tap">
      <button
        v-if="showTapToPlay"
        type="button"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-[2px] transition"
        @click="handleTapToPlay"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-14 w-14 text-white drop-shadow-lg"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <span class="text-sm font-medium text-white/90 drop-shadow">Tap to play</span>
      </button>
    </Transition>
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
    const showTapToPlay = ref(false);

    const isEmbedSrc = computed(() => isYouTubeUrl(props.src || ""));

    const playerSrc = computed(() => {
      const s = props.src || "";
      if (isYouTubeUrl(s)) return s;
      if (s.match(/vimeo\.com\/(?:video\/)?\d+/)) return s;
      return s;
    });

    // ── Mobile single-tap strategy ───────────────────────────────────
    //
    // Mobile browsers block *unmuted* autoplay but universally allow
    // *muted* autoplay. Strategy:
    //
    //   1. On mobile + YouTube, force the <media-player> muted before
    //      Vidstack builds the YouTube iframe params (mute=1 in URL).
    //   2. Vidstack's autoPlay sends `playVideo` → YouTube plays muted.
    //   3. Once the `playing` event fires we unmute via the YouTube
    //      iframe API (`unMute` postMessage). Changing volume/mute of
    //      an already-playing video does NOT require a new user gesture.
    //   4. Result: single tap → video plays with sound.
    //
    // Fallback: if the handshake or autoplay still fails after 4 s
    // we force-pause so Vidstack's play button appears immediately.

    let cleanups: (() => void)[] = [];

    const setupMobileRecovery = () => {
      teardown();

      const el = playerEl.value as (HTMLElement & { muted?: boolean; pause?: () => void }) | null;
      if (!el || !isMobile || !isEmbedSrc.value) return;

      // ── Step 1: force muted so YouTube autoplay succeeds ──
      if (props.autoplay) {
        try {
          el.muted = true;
          // Belt-and-suspenders: also set the attribute so Vidstack's
          // prop observer picks it up before building iframe params.
          el.setAttribute("muted", "");
        } catch {
          // swallow
        }
      }

      // ── Step 2: handshake retry ──
      let attempts = 0;
      const MAX_RETRIES = 15;
      const retryTimer = setInterval(() => {
        if (!el || attempts >= MAX_RETRIES || el.hasAttribute("can-play")) {
          clearInterval(retryTimer);
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
            // ignore
          }
        }
      }, 1000);
      cleanups.push(() => clearInterval(retryTimer));

      // ── Step 3: unmute once playback starts ──
      if (props.autoplay) {
        const onPlaying = () => {
          // Short delay lets YouTube stabilise before unmuting
          const t = setTimeout(() => {
            try {
              el.muted = false;
              el.removeAttribute("muted");
            } catch {
              // swallow
            }
          }, 400);
          cleanups.push(() => clearTimeout(t));
        };
        el.addEventListener("playing", onPlaying, { once: true });
        cleanups.push(() => el.removeEventListener("playing", onPlaying));

        // ── Step 4: fallback if autoplay still fails ──
        const fallback = setTimeout(() => {
          if (!el.hasAttribute("started")) {
            try {
              el.muted = false;
              el.removeAttribute("muted");
              el.pause?.();
            } catch {
              // swallow
            }
            showTapToPlay.value = true;
          }
        }, 4000);
        cleanups.push(() => clearTimeout(fallback));
      }
    };

    const handleTapToPlay = () => {
      showTapToPlay.value = false;
      const el = playerEl.value as any;
      if (el?.play) {
        try { el.play(); } catch { /* swallow */ }
      }
    };

    const teardown = () => {
      cleanups.forEach((fn) => fn());
      cleanups = [];
      showTapToPlay.value = false;
    };

    onMounted(() => setupMobileRecovery());
    onUnmounted(() => teardown());
    watch(() => props.src, () => setupMobileRecovery());

    return { playerEl, playerSrc, showTapToPlay, handleTapToPlay };
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
 * On mobile, Vidstack inserts .vds-blocker over YouTube/Vimeo iframes.
 * If the API handshake hasn't completed the player is stuck loading and
 * the blocker prevents tapping YouTube's native play button.
 */
@media (hover: none) and (pointer: coarse) {
  media-player:not([can-play]) .vds-blocker {
    pointer-events: none !important;
  }

  media-player:not([can-play]) iframe {
    pointer-events: auto !important;
    position: relative;
    z-index: 1;
  }
}

/* Tap-to-play overlay transition */
.fade-tap-enter-active,
.fade-tap-leave-active {
  transition: opacity 0.25s ease;
}
.fade-tap-enter-from,
.fade-tap-leave-to {
  opacity: 0;
}
</style>
