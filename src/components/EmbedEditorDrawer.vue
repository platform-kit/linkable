<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :style="{ width: expanded ? '100vw' : 'min(520px, 96vw)' }"
    :showCloseIcon="true"
  >
    <template #header>
      <div class="flex w-full items-center justify-between">
        <div>
          <div class="text-sm font-extrabold tracking-tight text-[color:var(--color-ink)]">
            {{ draft.label || "Edit embed" }}
          </div>
          <div class="mt-0.5 text-xs font-semibold text-[color:var(--color-ink-soft)]">
            Paste any HTML embed code (e.g. Cal.com, Zoom, YouTube).
          </div>
        </div>
        <button
          type="button"
          class="cms-expand-toggle hidden md:flex"
          :title="expanded ? 'Collapse panel' : 'Expand panel'"
          @click="expanded = !expanded"
        >
          <i class="pi" :class="expanded ? 'pi-angle-right' : 'pi-angle-left'" />
        </button>
      </div>
    </template>

    <div class="space-y-4 p-2">
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--glass)] p-3 shadow-sm">
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">Tab label</label>
            <InputText v-model="draft.label" class="w-full" placeholder="e.g. Book a Call" />
            <div class="text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
              This text appears as a navigation tab on your public page.
            </div>
          </div>

          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">Icon</label>
            <AutoComplete
              v-model="draft.icon"
              :suggestions="filteredIcons"
              @complete="searchIcons"
              placeholder="Search icons… e.g. Calendar"
              class="w-full"
              :inputClass="'w-full'"
              forceSelection
            >
              <template #option="{ option }">
                <div class="flex items-center gap-2.5 py-0.5">
                  <component :is="getIconComponent(option)" :size="18" class="shrink-0 text-[color:var(--color-ink-soft)]" />
                  <span class="text-sm font-medium">{{ option }}</span>
                </div>
              </template>
              <template #value="{ value }">
                <div v-if="value" class="flex items-center gap-2">
                  <component :is="getIconComponent(value)" :size="16" class="shrink-0 text-[color:var(--color-ink-soft)]" />
                  <span>{{ value }}</span>
                </div>
              </template>
            </AutoComplete>
            <div class="text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
              Choose from <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" class="underline">Lucide icons</a>. Type to search.
            </div>
          </div>

          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">Embed HTML or URL</label>
            <Textarea
              v-model="draft.html"
              rows="10"
              class="w-full"
              placeholder='https://cal.com/yourname  or  <iframe src="https://..."></iframe>'
              style="font-family: monospace; font-size: 13px"
            />
            <div class="text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
              Paste a URL or full HTML embed code. A plain URL will be auto-wrapped in an iframe.
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--glass-2)] p-3">
            <div>
              <div class="text-xs font-extrabold text-[color:var(--color-ink)]">Enabled</div>
              <div class="mt-0.5 text-xs font-semibold text-[color:var(--color-ink-soft)]">
                Disable to hide this embed tab from the public page.
              </div>
            </div>
            <ToggleSwitch v-model="draft.enabled" />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="draft.html.trim()" class="rounded-2xl border border-[var(--color-border)] bg-[var(--glass)] p-3 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">Preview</span>
          <span v-if="isAutoIframe" class="text-[10px] font-semibold text-[color:var(--color-brand)]">
            <i class="pi pi-info-circle" style="font-size:10px" /> URL auto-wrapped in iframe
          </span>
        </div>
        <div class="embed-preview overflow-hidden rounded-xl border border-[var(--color-border)]" v-html="resolvedHtml" />
      </div>

      <div class="flex items-center justify-between gap-2">
        <Button
          rounded
          text
          severity="danger"
          class="!rounded-full"
          @click="$emit('delete')"
        >
          <i class="pi pi-trash" />
          <span class="ml-2">Delete</span>
        </Button>

        <div class="flex items-center gap-2">
          <Button rounded severity="secondary" class="!rounded-full" @click="reset">
            <i class="pi pi-undo" />
            <span class="ml-2">Reset</span>
          </Button>
          <Button rounded class="cmsPrimary !rounded-full" @click="save">
            <i class="pi pi-check" />
            <span class="ml-2">Save</span>
          </Button>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";

import Button from "primevue/button";
import Drawer from "primevue/drawer";
import AutoComplete from "primevue/autocomplete";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import ToggleSwitch from "primevue/toggleswitch";
import { icons } from "lucide-vue-next";

import type { EmbedItem } from "../lib/model";

const FEATURED_ICONS = [
  "Code",
  "Calendar",
  "Video",
  "Globe",
  "Phone",
  "ExternalLink",
  "MessageCircle",
  "FileText",
  "ShoppingBag",
  "Ticket",
  "Map",
  "Music",
  "Play",
  "BookOpen",
  "Presentation",
  "Users",
  "Headphones",
  "Podcast",
  "Store",
  "Heart",
];

const ALL_ICON_NAMES: string[] = Object.keys(icons);

/** Detect if input is a bare URL (not HTML) and wrap in an iframe. */
function resolveEmbedHtml(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // If it looks like HTML (contains < and >), return as-is
  if (trimmed.includes("<") && trimmed.includes(">")) return trimmed;
  // Try parsing as a URL
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `<iframe src="${url.href}" width="100%" height="600" frameborder="0" style="border:0;border-radius:0.75rem" allow="camera;microphone;fullscreen;payment" loading="lazy"></iframe>`;
    }
  } catch {
    // not a valid URL — return as-is
  }
  return trimmed;
}

export { resolveEmbedHtml };

export default defineComponent({
  name: "EmbedEditorDrawer",
  components: { Drawer, Button, AutoComplete, InputText, Textarea, ToggleSwitch },
  props: {
    open: { type: Boolean, required: true },
    modelValue: { type: Object as () => EmbedItem, required: true },
  },
  emits: ["update:open", "update:modelValue", "delete"],
  setup(props, { emit }) {
    const visible = ref(props.open);
    const expanded = ref(false);

    watch(
      () => props.open,
      (v) => {
        visible.value = v;
      },
    );
    watch(visible, (v) => emit("update:open", v));

    const draft = ref<EmbedItem>({ ...props.modelValue });

    // ── Icon autocomplete ──
    const filteredIcons = ref<string[]>(FEATURED_ICONS);

    const searchIcons = (event: { query: string }) => {
      const q = (event.query || "").trim().toLowerCase();
      if (!q) {
        filteredIcons.value = FEATURED_ICONS;
        return;
      }
      filteredIcons.value = ALL_ICON_NAMES
        .filter((name) => name.toLowerCase().includes(q))
        .slice(0, 40);
    };

    const getIconComponent = (name: string) => {
      const table = icons as Record<string, any>;
      return table[name] ?? table["Globe"];
    };

    const resolvedHtml = computed(() => resolveEmbedHtml(draft.value.html));
    const isAutoIframe = computed(() => {
      const trimmed = draft.value.html.trim();
      return trimmed && !(trimmed.includes("<") && trimmed.includes(">")) && resolvedHtml.value !== trimmed;
    });

    watch(
      () => props.modelValue,
      (v) => {
        draft.value = { ...v };
      },
      { deep: true },
    );

    const save = () => {
      emit("update:modelValue", { ...draft.value });
    };

    const reset = () => {
      draft.value = { ...props.modelValue };
    };

    return {
      visible,
      expanded,
      draft,
      filteredIcons,
      searchIcons,
      getIconComponent,
      resolvedHtml,
      isAutoIframe,
      save,
      reset,
      title: props.modelValue.label,
    };
  },
});
</script>

<style scoped>
.embed-preview :deep(iframe) {
  max-width: 100%;
  border-radius: 0.75rem;
}
</style>
