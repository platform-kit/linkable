<!--
  Vendored & adapted from vue-bits (https://vue-bits.dev/components/masonry)
  Original by David Haz — MIT + Commons Clause
  Adapted to use slots for custom content instead of background-image items.
-->
<template>
  <div ref="containerRef" class="relative w-full" :style="{ height: containerHeight + 'px' }">
    <div
      v-for="item in grid"
      :key="item.id"
      :data-key="item.id"
      class="absolute box-content"
      :style="{ willChange: 'transform, width, height, opacity' }"
      @mouseenter="(e: MouseEvent) => handleMouseEnter(item.id, e.currentTarget as HTMLElement)"
      @mouseleave="(e: MouseEvent) => handleMouseLeave(item.id, e.currentTarget as HTMLElement)"
    >
      <div class="relative w-full h-full overflow-hidden rounded-xl">
        <slot :item="item" :index="items.indexOf(item)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watchEffect,
  nextTick,
  useTemplateRef,
} from "vue";
import { gsap } from "gsap";

export interface MasonryItem {
  id: string;
  /** Height hint for layout calculation — aspect ratio numerator (will be divided by 2) */
  height: number;
  [key: string]: unknown;
}

interface MasonryGridProps {
  items: MasonryItem[];
  gap?: number;
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
}

const props = withDefaults(defineProps<MasonryGridProps>(), {
  gap: 12,
  ease: "power3.out",
  duration: 0.6,
  stagger: 0.04,
  animateFrom: "bottom",
  scaleOnHover: false,
  hoverScale: 0.97,
});

/* ---------- responsive column count ---------- */
const useMedia = (
  queries: string[],
  values: number[],
  defaultValue: number,
) => {
  const get = () =>
    values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue;
  const value = ref<number>(get());

  onMounted(() => {
    const handler = () => (value.value = get());
    queries.forEach((q) =>
      matchMedia(q).addEventListener("change", handler),
    );
    onUnmounted(() => {
      queries.forEach((q) =>
        matchMedia(q).removeEventListener("change", handler),
      );
    });
  });

  return value;
};

/* ---------- container size observation ---------- */
const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const containerWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    containerWidth.value = entry.contentRect.width;
  });
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

/* ---------- columns ---------- */
const columns = useMedia(
  ["(min-width:1024px)", "(min-width:640px)"],
  [3, 3],
  2,
);

/* ---------- grid layout calculation ---------- */
export interface LayoutItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

const grid = computed<LayoutItem[]>(() => {
  if (!containerWidth.value) return [];
  const gap = props.gap;
  const cols = columns.value;
  const totalGaps = (cols - 1) * gap;
  const columnWidth = (containerWidth.value - totalGaps) / cols;
  const colHeights = new Array(cols).fill(0);

  return props.items.map((child) => {
    const col = colHeights.indexOf(Math.min(...colHeights));
    const x = col * (columnWidth + gap);
    const h = child.height / 2;
    const y = colHeights[col];
    colHeights[col] += h + gap;
    return { ...child, x, y, w: columnWidth, h };
  });
});

const containerHeight = computed(() => {
  if (!grid.value.length) return 0;
  return Math.max(...grid.value.map((item) => item.y + item.h));
});

/* ---------- animation helpers ---------- */
const hasMounted = ref(false);

const getInitialPosition = (item: LayoutItem) => {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return { x: item.x, y: item.y };

  let direction = props.animateFrom;
  if (direction === "random") {
    const dirs: Array<typeof props.animateFrom> = [
      "top",
      "bottom",
      "left",
      "right",
    ];
    direction = dirs[Math.floor(Math.random() * dirs.length)];
  }

  switch (direction) {
    case "top":
      return { x: item.x, y: -200 };
    case "bottom":
      return { x: item.x, y: window.innerHeight + 200 };
    case "left":
      return { x: -200, y: item.y };
    case "right":
      return { x: window.innerWidth + 200, y: item.y };
    case "center":
      return {
        x: rect.width / 2 - item.w / 2,
        y: rect.height / 2 - item.h / 2,
      };
    default:
      return { x: item.x, y: item.y + 100 };
  }
};

/* ---------- hover ---------- */
const handleMouseEnter = (id: string, _el: HTMLElement) => {
  if (props.scaleOnHover) {
    gsap.to(`[data-key="${id}"]`, {
      scale: props.hoverScale,
      duration: 0.3,
      ease: "power2.out",
    });
  }
};

const handleMouseLeave = (id: string, _el: HTMLElement) => {
  if (props.scaleOnHover) {
    gsap.to(`[data-key="${id}"]`, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    });
  }
};

/* ---------- animate on layout changes ---------- */
watchEffect(() => {
  const currentGrid = grid.value;
  // track deps
  void props.items.length;
  void columns.value;
  void containerWidth.value;

  if (!currentGrid.length) return;

  nextTick(() => {
    currentGrid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      };

      if (!hasMounted.value) {
        const start = getInitialPosition(item);
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: start.x,
            y: start.y,
            width: item.w,
            height: item.h,
          },
          {
            opacity: 1,
            ...animProps,
            duration: 0.8,
            ease: "power3.out",
            delay: index * props.stagger,
          },
        );
      } else {
        gsap.to(selector, {
          ...animProps,
          duration: props.duration,
          ease: props.ease,
          overwrite: "auto",
        });
      }
    });
    hasMounted.value = true;
  });
});
</script>
