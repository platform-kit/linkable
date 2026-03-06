<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Filter by tags"
    :style="{ width: 'min(400px, 90vw)' }"
  >
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tag in tags"
        :key="tag"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
        :class="selectedTags.includes(tag)
          ? 'border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-[color:var(--color-brand)]'
          : 'border-[var(--color-border)] bg-[var(--glass)] text-[color:var(--color-ink-soft)] hover:bg-[var(--glass-strong)]'"
        @click="toggle(tag)"
      >
        <i class="pi text-[10px]" :class="selectedTags.includes(tag) ? 'pi-check-circle' : 'pi-circle'" />
        {{ tag }}
      </button>
    </div>
    <div v-if="selectedTags.length > 0" class="mt-4 flex justify-end">
      <button
        type="button"
        class="text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
        @click="$emit('update:selectedTags', [])"
      >
        Clear all
      </button>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from "vue";
import Dialog from "primevue/dialog";

export default defineComponent({
  name: "TagFilterDialog",
  components: { Dialog },
  props: {
    open: { type: Boolean, required: true },
    tags: { type: Array as PropType<string[]>, required: true },
    selectedTags: { type: Array as PropType<string[]>, required: true },
  },
  emits: ["update:open", "update:selectedTags"],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.open,
      set: (v: boolean) => emit("update:open", v),
    });

    const toggle = (tag: string) => {
      const next = [...props.selectedTags];
      const idx = next.indexOf(tag);
      if (idx >= 0) next.splice(idx, 1);
      else next.push(tag);
      emit("update:selectedTags", next);
    };

    return { visible, toggle };
  },
});
</script>
