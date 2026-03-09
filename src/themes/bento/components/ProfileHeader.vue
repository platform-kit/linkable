<template>
  <header class="mx-auto w-full max-w-[740px] px-3 pt-4 sm:px-4 sm:pt-10">
    <div class="glass overflow-hidden rounded-[var(--radius-xl)]">
      <!-- Banner image -->
      <img
        v-if="bannerSrc"
        :src="bannerSrc"
        alt="Banner"
        class="h-28 w-full object-cover sm:h-52"
        @error="$emit('banner-error')"
      />

      <div class="p-3 sm:p-6">
        <div class="flex items-start gap-3 sm:gap-4">
          <div
            class="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--glass-2)] shadow-sm backdrop-blur-md"
          >
            <img
              v-if="avatarSrc"
              :src="avatarSrc"
              alt="Avatar"
              class="h-full w-full object-cover"
              @error="$emit('avatar-error')"
            />
            <div
              v-else
              class="grid h-full w-full place-items-center bg-[var(--glass)] text-sm font-semibold text-[color:var(--color-ink-soft)]"
            >
              {{ initials }}
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <div
              class="flex items-start justify-between gap-3"
              @dblclick="$emit('dblclick-name')"
            >
              <div class="min-w-0 cursor-pointer select-none">
                <h1
                  class="truncate text-lg font-semibold tracking-tight sm:text-2xl"
                >
                  {{ displayName || "Your Name" }}
                </h1>
                <p
                  v-if="tagline"
                  class="mt-1 line-clamp-2 text-sm text-[color:var(--color-ink-soft)]"
                >
                  {{ tagline }}
                </p>
                <p
                  v-else
                  class="mt-1 text-sm text-[color:var(--color-ink-soft)]"
                >
                  Add a short tagline in the CMS.
                </p>
              </div>
            </div>

            <div
              class="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2"
            >
              <a
                v-for="s in socials"
                :key="s.id"
                class="card-item inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition sm:gap-2 sm:px-3 sm:py-1.5"
                :href="socialHref(s)"
                :target="isEmailUrl(s.url) ? undefined : '_blank'"
                rel="noreferrer"
                @click="$emit('social-click', socialHref(s), s.label)"
              >
                <component :is="resolveIcon(s.icon)" :size="14" class="shrink-0" />
                <span class="truncate">{{ s.label }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { SocialLink } from "@/lib/model";
import type { ProfileHeaderProps as _ProfileHeaderProps, ProfileHeaderEmits as _ProfileHeaderEmits } from "@/lib/component-contracts";
export type { ProfileHeaderProps, ProfileHeaderEmits } from "@/lib/component-contracts";
import { icons as lucideIcons } from "lucide-vue-next";

export default defineComponent({
  name: "ProfileHeader",
  props: {
    displayName: { type: String, default: "" },
    tagline: { type: String, default: "" },
    avatarSrc: { type: String, default: "" },
    bannerSrc: { type: String, default: "" },
    initials: { type: String, default: "LB" },
    socials: { type: Array as PropType<SocialLink[]>, default: () => [] },
  },
  emits: ["avatar-error", "banner-error", "dblclick-name", "social-click"],
  setup() {
    const isEmailUrl = (url: string) => {
      if (!url) return false;
      if (url.startsWith("mailto:")) return true;
      return url.includes("@") && url.includes(".");
    };

    const socialHref = (s: { url: string }) => {
      if (isEmailUrl(s.url) && !s.url.startsWith("mailto:")) {
        return "mailto:" + s.url;
      }
      return s.url;
    };

    const resolveIcon = (name: string) => {
      return (lucideIcons as Record<string, any>)[name] ?? (lucideIcons as Record<string, any>)["Globe"];
    };

    return { isEmailUrl, socialHref, resolveIcon };
  },
});
</script>
