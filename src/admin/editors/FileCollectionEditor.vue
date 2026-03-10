<template>
  <div>
    <div class="cms__panel-head cms__panel-head--row" style="margin-bottom: 8px">
      <div>
        <div class="cms__sub">
          Manage {{ schema.label }} items (stored as {{ format }} files in
          <code>{{ schema.directory }}</code>).
        </div>
      </div>
      <Button rounded class="cms__primary cms__primary--addon" @click="openNew">
        <i class="pi pi-plus" />
        <span class="cms__btn-label">New item</span>
        <span class="cms__btn-label--compact">New</span>
      </Button>
    </div>

    <div class="cms__card">
      <div v-if="items.length === 0" class="cms__empty">
        <div class="cms__empty-title">No items yet</div>
        <div class="cms__empty-sub">Click "New item" to create your first entry.</div>
      </div>

      <div v-else class="cms__list">
        <button
          v-for="item in items"
          :key="item.slug as string"
          type="button"
          class="cms__row"
          @click="openExisting(item.slug as string)"
        >
          <span v-if="schema.itemThumbnail?.(item)" class="cms__row-thumb">
            <img :src="schema.itemThumbnail(item)" class="h-8 w-8 rounded object-cover" />
          </span>
          <span v-else class="cms__row-thumb">
            <i class="pi pi-file text-[color:var(--color-ink-soft)]" />
          </span>
          <span class="cms__row-text">
            <span class="cms__row-title">{{ getItemLabel(item) }}</span>
            <span v-if="schema.itemSublabel" class="cms__row-sub">{{ schema.itemSublabel(item) }}</span>
          </span>
          <span class="cms__row-meta">
            <i class="pi pi-angle-right text-[color:var(--color-ink-soft)]" />
          </span>
        </button>
      </div>
    </div>

    <!-- Item editor drawer -->
    <CollectionItemDrawer
      v-if="drawerOpen && drawerItem && itemSchema"
      :open="drawerOpen"
      :schema="itemSchema"
      :schemaKey="drawerSlug"
      :modelValue="drawerItem"
      :title="drawerSlug ? `Edit ${schema.label}` : `New ${schema.label}`"
      @update:open="drawerOpen = $event"
      @update:modelValue="onDrawerUpdate"
      @delete="onDelete"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, type PropType } from "vue";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import CollectionItemDrawer from "../CollectionItemDrawer.vue";
import type { ContentSchema } from "@/lib/layout-manifest";
import type { ContentCollection } from "@/lib/model";
import {
  fetchCollectionItems,
  fetchCollectionItem,
  saveCollectionItem,
  deleteCollectionItem,
} from "@/lib/collections";
import type { FormKitSchemaNode } from "@formkit/core";

export default defineComponent({
  name: "FileCollectionEditor",
  components: { Button, CollectionItemDrawer },
  props: {
    schema: { type: Object as PropType<ContentSchema>, required: true },
    collection: { type: Object as PropType<ContentCollection>, required: true },
  },
  setup(props) {
    const toast = useToast();
    const items = ref<Record<string, unknown>[]>([]);
    const drawerOpen = ref(false);
    const drawerItem = ref<Record<string, unknown> | null>(null);
    const drawerSlug = ref("");

    const format = computed(() => props.schema.format ?? "markdown");

    const itemSchema = computed<FormKitSchemaNode[] | undefined>(() => {
      const s = props.schema.itemSchema;
      if (!s) return undefined;
      if (typeof s === "function") return s(drawerItem.value ?? {});
      return s;
    });

    const getItemLabel = (item: Record<string, unknown>): string => {
      if (props.schema.itemLabel) return props.schema.itemLabel(item);
      return (item.title as string) || (item.label as string) || (item.name as string) || (item.slug as string) || "Untitled";
    };

    const slugify = (text: string): string =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120) || "untitled";

    const refresh = async () => {
      try {
        items.value = await fetchCollectionItems(props.schema.key);
      } catch {
        items.value = [];
      }
    };

    const openNew = () => {
      const newItem = props.schema.newItem?.() ?? {};
      drawerItem.value = newItem;
      drawerSlug.value = "";
      drawerOpen.value = true;
    };

    const openExisting = async (slug: string) => {
      try {
        const item = await fetchCollectionItem(props.schema.key, slug);
        if (!item) {
          toast.add({ severity: "error", summary: "Error", detail: "Item not found.", life: 2600 });
          return;
        }
        drawerItem.value = item;
        drawerSlug.value = slug;
        drawerOpen.value = true;
      } catch {
        toast.add({ severity: "error", summary: "Error", detail: "Could not load item.", life: 2600 });
      }
    };

    const onDrawerUpdate = async (value: Record<string, unknown>) => {
      drawerItem.value = value;

      // Auto-save on change
      const slugField = props.schema.slugField ?? "title";
      const slug = drawerSlug.value || slugify(String(value[slugField] ?? "untitled"));

      try {
        await saveCollectionItem(props.schema.key, slug, value);
        if (!drawerSlug.value) {
          drawerSlug.value = slug;
        }
        await refresh();
      } catch (e: any) {
        toast.add({ severity: "error", summary: "Save failed", detail: e?.message, life: 3000 });
      }
    };

    const onDelete = async () => {
      if (!drawerSlug.value) {
        drawerOpen.value = false;
        return;
      }
      try {
        await deleteCollectionItem(props.schema.key, drawerSlug.value);
        drawerOpen.value = false;
        await refresh();
        toast.add({ severity: "success", summary: "Deleted", detail: "Item removed.", life: 2000 });
      } catch (e: any) {
        toast.add({ severity: "error", summary: "Delete failed", detail: e?.message, life: 3000 });
      }
    };

    onMounted(() => refresh());

    return {
      items,
      drawerOpen,
      drawerItem,
      drawerSlug,
      format,
      itemSchema,
      getItemLabel,
      openNew,
      openExisting,
      onDrawerUpdate,
      onDelete,
      refresh,
    };
  },
});
</script>
