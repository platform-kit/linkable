<template>
  <div>
    <!-- Header: title + Add button -->
    export default defineComponent({
      name: "CollectionListEditor",
      components: { draggable, Button, Tag, CollectionItemDrawer },
      props: {
        schema: { type: Object as PropType<ContentSchema>, required: true },
        collection: { type: Object as PropType<ContentCollection>, required: true },
        items: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
        initialItemId: { type: String, default: "" },
      },
      emits: ["update:items", "update:collection"],
      setup(props, { emit }) {
        const editorOpen = ref(false);
        const activeItemId = ref("");
        const external = computed(() => !!props.schema.external || !!props.schema.directory);
        const items = ref<Record<string, unknown>[]>(props.items);

        // For external collections, fetch items from the local filesystem (dev: Vite middleware, prod: static JSON)
        const fetchExternalItems = async () => {
          const key = props.schema.key;
          let url = "";
          if (import.meta.env.DEV) {
            url = `/__collection/${encodeURIComponent(key)}`;
          } else {
            url = `/content/collections/${encodeURIComponent(key)}/index.json`;
          }
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
              items.value = await res.json();
            }
          } catch (err) {
            console.warn(`[CollectionListEditor] Failed to fetch external items:`, err);
          }
        };

        // Watch for external collections and fetch items
        onMounted(() => {
          if (external.value) {
            fetchExternalItems();
          } else {
            items.value = props.items;
          }
          if (props.initialItemId) {
            const found = items.value.find((i) => (i as any).id === props.initialItemId);
            if (found) openEditor(props.initialItemId);
          }
        });

        // For live reload, refetch external items when schema changes
        watch(() => props.schema, () => {
          if (external.value) fetchExternalItems();
        });

        const activeItem = computed(() =>
          items.value.find((i) => i.id === activeItemId.value) ?? null,
        );

        const activeSchema = computed(() => {
          const s = props.schema.itemSchema;
          if (!s) return null;
          if (typeof s === 'function') return activeItem.value ? s(activeItem.value) : null;
          return s;
        });

        const activeSchemaKey = computed(() => {
          if (!activeItem.value) return 'empty';
          const item = activeItem.value as Record<string, unknown>;
          return `${item.textVariant ?? ''}|${item.backgroundVariant ?? ''}`;
        });

        const openEditor = (id: string) => {
          activeItemId.value = id;
          editorOpen.value = true;
        };

        const addItem = () => {
          const factory = props.schema.newItem;
          if (!factory) return;
          const item = factory();
          items.value = [item, ...items.value];
          emit("update:items", items.value);
          activeItemId.value = item.id as string;
          editorOpen.value = true;
        };

        const updateItem = (updated: Record<string, any>) => {
          const idx = items.value.findIndex((i) => i.id === updated.id);
          if (idx >= 0) {
            const copy = [...items.value];
            copy[idx] = updated;
            items.value = copy;
            emit("update:items", copy);
          }
        };

        const deleteItem = () => {
          items.value = items.value.filter((i) => i.id !== activeItemId.value);
          emit("update:items", items.value);
          editorOpen.value = false;
          activeItemId.value = "";
        };

        const duplicateItem = () => {
          if (!activeItem.value) return;
          let cloned: Record<string, unknown>;
          if (typeof globalThis.structuredClone === "function") {
            cloned = globalThis.structuredClone(activeItem.value) as Record<string, unknown>;
          } else {
            cloned = JSON.parse(JSON.stringify(activeItem.value)) as Record<string, unknown>;
          }
          cloned.id = newId();
          const nextItems = [cloned, ...items.value];
          items.value = nextItems;
          emit("update:items", nextItems);
          activeItemId.value = String(cloned.id);
          editorOpen.value = true;
        };

        const getLabel = (item: any) =>
          props.schema.itemLabel?.(item) ?? item.title ?? item.label ?? "Untitled";

        const getSublabel = (item: any) =>
          props.schema.itemSublabel?.(item) ?? item.url ?? item.subtitle ?? "";

        const getThumb = (item: any) =>
          props.schema.itemThumbnail?.(item) ?? undefined;

        return {
          editorOpen,
          activeItemId,
          activeItem,
          activeSchema,
          activeSchemaKey,
          openEditor,
          addItem,
          updateItem,
          deleteItem,
          duplicateItem,
          getLabel,
          getSublabel,
          getThumb,
          items,
        };
      }
    });
      emit("update:items", props.items.filter((i) => i.id !== activeItemId.value));
      const editorOpen = ref(false);
      const activeItemId = ref("");
      const external = computed(() => !!props.schema.external || !!props.schema.directory);
      const items = ref<Record<string, unknown>[]>(props.items);

      // For external collections, fetch items from the local filesystem (dev: Vite middleware, prod: static JSON)
      const fetchExternalItems = async () => {
        const key = props.schema.key;
        let url = "";
        if (import.meta.env.DEV) {
          url = `/__collection/${encodeURIComponent(key)}`;
        } else {
          url = `/content/collections/${encodeURIComponent(key)}/index.json`;
        }
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            items.value = await res.json();
          }
        } catch (err) {
          console.warn(`[CollectionListEditor] Failed to fetch external items:`, err);
        }
      };

      // Watch for external collections and fetch items
      onMounted(() => {
        if (external.value) {
          fetchExternalItems();
        } else {
          items.value = props.items;
        }
        if (props.initialItemId) {
          const found = items.value.find((i) => (i as any).id === props.initialItemId);
          if (found) openEditor(props.initialItemId);
        }
      });

      export default defineComponent({
        name: "CollectionListEditor",
        components: { draggable, Button, Tag, CollectionItemDrawer },
        props: {
          schema: { type: Object as PropType<ContentSchema>, required: true },
          collection: { type: Object as PropType<ContentCollection>, required: true },
          items: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
          initialItemId: { type: String, default: "" },
        },
        emits: ["update:items", "update:collection"],
        setup(props, { emit }) {
          const editorOpen = ref(false);
          const activeItemId = ref("");
          const external = computed(() => !!props.schema.external || !!props.schema.directory);
          const items = ref<Record<string, unknown>[]>(props.items);

          // For external collections, fetch items from the local filesystem (dev: Vite middleware, prod: static JSON)
          const fetchExternalItems = async () => {
            const key = props.schema.key;
            let url = "";
            if (import.meta.env.DEV) {
              url = `/__collection/${encodeURIComponent(key)}`;
            } else {
              url = `/content/collections/${encodeURIComponent(key)}/index.json`;
            }
            try {
              const res = await fetch(url, { cache: "no-store" });
              if (res.ok) {
                items.value = await res.json();
              }
            } catch (err) {
              console.warn(`[CollectionListEditor] Failed to fetch external items:`, err);
            }
          };

          // Watch for external collections and fetch items
          onMounted(() => {
            if (external.value) {
              fetchExternalItems();
            } else {
              items.value = props.items;
            }
            if (props.initialItemId) {
              const found = items.value.find((i) => (i as any).id === props.initialItemId);
              if (found) openEditor(props.initialItemId);
            }
          });

          // For live reload, refetch external items when schema changes
          watch(() => props.schema, () => {
            if (external.value) fetchExternalItems();
          });

          const activeItem = computed(() =>
            items.value.find((i) => i.id === activeItemId.value) ?? null,
          );

          const activeSchema = computed(() => {
            const s = props.schema.itemSchema;
            if (!s) return null;
            if (typeof s === 'function') return activeItem.value ? s(activeItem.value) : null;
            return s;
          });

          const activeSchemaKey = computed(() => {
            if (!activeItem.value) return 'empty';
            const item = activeItem.value as Record<string, unknown>;
            return `${item.textVariant ?? ''}|${item.backgroundVariant ?? ''}`;
          });

          const openEditor = (id: string) => {
            activeItemId.value = id;
            editorOpen.value = true;
          };

          const addItem = () => {
            const factory = props.schema.newItem;
            if (!factory) return;
            const item = factory();
            items.value = [item, ...items.value];
            emit("update:items", items.value);
            activeItemId.value = item.id as string;
            editorOpen.value = true;
          };

          const updateItem = (updated: Record<string, any>) => {
            const idx = items.value.findIndex((i) => i.id === updated.id);
            if (idx >= 0) {
              const copy = [...items.value];
              copy[idx] = updated;
              items.value = copy;
              emit("update:items", copy);
            }
          };

          const deleteItem = () => {
            items.value = items.value.filter((i) => i.id !== activeItemId.value);
            emit("update:items", items.value);
            editorOpen.value = false;
            activeItemId.value = "";
          };

          const duplicateItem = () => {
            if (!activeItem.value) return;
            let cloned: Record<string, unknown>;
            if (typeof globalThis.structuredClone === "function") {
              cloned = globalThis.structuredClone(activeItem.value) as Record<string, unknown>;
            } else {
              cloned = JSON.parse(JSON.stringify(activeItem.value)) as Record<string, unknown>;
            }
            cloned.id = newId();
            const nextItems = [cloned, ...items.value];
            items.value = nextItems;
            emit("update:items", nextItems);
            activeItemId.value = String(cloned.id);
            editorOpen.value = true;
          };

          const getLabel = (item: any) =>
            props.schema.itemLabel?.(item) ?? item.title ?? item.label ?? "Untitled";

          const getSublabel = (item: any) =>
            props.schema.itemSublabel?.(item) ?? item.url ?? item.subtitle ?? "";

          const getThumb = (item: any) =>
            props.schema.itemThumbnail?.(item) ?? undefined;

          return {
            editorOpen,
            activeItemId,
            activeItem,
            activeSchema,
            activeSchemaKey,
            openEditor,
            addItem,
            updateItem,
            deleteItem,
            duplicateItem,
            getLabel,
            getSublabel,
            getThumb,
            items,
          };
        }
      });
    }
  }
});
