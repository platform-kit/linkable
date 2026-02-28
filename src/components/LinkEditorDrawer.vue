<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :style="{ width: 'min(520px, 96vw)' }"
    :showCloseIcon="false"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-extrabold tracking-tight text-[color:var(--color-ink)]">
            {{ title || "Edit link" }}
          </div>
          <div class="mt-0.5 text-xs font-semibold text-[color:var(--color-ink-soft)]">
            Update the link details, then close to continue.
          </div>
        </div>
        <Button rounded severity="secondary" class="!px-3 !py-2 !text-xs" @click="visible = false">
          <i class="pi pi-times" />
          <span class="ml-2">Close</span>
        </Button>
      </div>
    </template>

    <div class="space-y-4 p-2">
      <div class="rounded-2xl border border-white/60 bg-white/55 p-3 shadow-sm backdrop-blur-md">
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">Title</label>
            <InputText v-model="draft.title" class="w-full" />
          </div>

          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]"
              >Description (optional)</label
            >
            <InputText v-model="draft.subtitle" class="w-full" placeholder="Short helper text…" />
          </div>

          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">URL</label>
            <InputText v-model="draft.url" class="w-full" placeholder="https://..." />
          </div>

          <div class="grid gap-1.5">
            <label class="text-xs font-extrabold text-[color:var(--color-ink-soft)]"
              >Thumbnail image (optional)</label
            >
            <InputText v-model="draft.imageUrl" class="w-full" placeholder="https://..." />
            <div v-if="draft.imageUrl" class="mt-2 flex items-center gap-3">
              <div
                class="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/70 bg-white/60 shadow-sm backdrop-blur-md"
              >
                <img :src="draft.imageUrl" alt="" class="h-full w-full object-cover" />
              </div>
              <div class="text-xs font-semibold text-[color:var(--color-ink-soft)]">
                Preview (if the URL is valid)
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/45 p-3">
            <div>
              <div class="text-xs font-extrabold text-[color:var(--color-ink)]">Enabled</div>
              <div class="mt-0.5 text-xs font-semibold text-[color:var(--color-ink-soft)]">
                Disable to hide this link from the public page.
              </div>
            </div>
            <ToggleSwitch v-model="draft.enabled" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <Button
          rounded
          text
          severity="danger"
          class="!rounded-full"
          @click="$emit('delete')"
          :disabled="busy"
        >
          <i class="pi pi-trash" />
          <span class="ml-2">Delete</span>
        </Button>

        <div class="flex items-center gap-2">
          <Button rounded severity="secondary" class="!rounded-full" @click="reset" :disabled="busy">
            <i class="pi pi-undo" />
            <span class="ml-2">Reset</span>
          </Button>
          <Button rounded class="cmsPrimary !rounded-full" @click="save" :disabled="busy">
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
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";

import type { BioLink } from "../lib/model";

export default defineComponent({
  name: "LinkEditorDrawer",
  components: { Drawer, Button, InputText, ToggleSwitch },
  props: {
    open: { type: Boolean, required: true },
    modelValue: { type: Object as () => BioLink, required: true },
    busy: { type: Boolean, default: false },
  },
  emits: ["update:open", "update:modelValue", "delete"],
  setup(props, { emit }) {
    const visible = ref(props.open);
    watch(
      () => props.open,
      (v) => (visible.value = v)
    );
    watch(visible, (v) => emit("update:open", v));

    const draft = ref<BioLink>({ ...props.modelValue });
    watch(
      () => props.modelValue,
      (v) => (draft.value = { ...v }),
      { deep: true }
    );

    const title = computed(() => (draft.value.title || "").trim());

    const reset = () => {
      draft.value = { ...props.modelValue };
    };

    const save = () => {
      emit("update:modelValue", { ...draft.value });
      visible.value = false;
    };

    return { visible, draft, title, reset, save };
  },
});
</script>

<style scoped>
.cmsPrimary {
  border: 0 !important;
  background: var(--color-brand) !important;
  box-shadow: 0 16px 44px rgba(37, 99, 235, 0.22) !important;
}

/* PrimeVue Drawer surface (solid, readable) */
:deep(.p-drawer) {
  background: #ffffff !important;
}
:deep(.p-drawer-header) {
  background: #ffffff !important;
  border-bottom: 1px solid rgba(11, 18, 32, 0.08);
}
:deep(.p-drawer-content) {
  background: #ffffff !important;
}
</style>