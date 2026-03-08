<template>  
  <div class="min-h-dvh flex flex-col">        
    <div v-if="!loaded" class="flex flex-1 items-center justify-center">
      <span class="text-lg text-[color:var(--color-ink-soft)]">Loading…</span>
    </div>
    <template v-else>          
      <component :is="LayoutRoot" :model="model" :layoutData="model.theme?.layoutData || {}" :route="route" :router="router" />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, provide, computed } from "vue";
import { defaultModel, type BioModel } from "../lib/model";
import { useComponent } from "../lib/component-resolver";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  name: "IndexPage",
  setup() {
    // Load the actual persisted model from public/data.json
    const model = ref<BioModel>(defaultModel());
    const loaded = ref(false);
    fetch("/data.json")
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch /data.json", res.status, res.statusText);
          throw new Error("Fetch failed");
        }
        return res.json();
      })
      .then((data) => {
        model.value = data;
        loaded.value = true;
        console.log("Loaded model:", data);
        if (data?.theme?.layoutData?.grid) {
          console.log("Grid data:", data.theme.layoutData.grid);
        } else {
          console.warn("No grid data found in model");
        }
      })
      .catch((err) => {
        loaded.value = true;
        console.error("Model load error:", err);
      });
    provide("bioModel", model);
    // Dynamically resolve the layout root component
    const activeLayout = computed(() => model.value.theme?.layout || "bento");
    const LayoutRoot = useComponent("Root", null, activeLayout);
    const route = useRoute();
    const router = useRouter();
    // Pass route info to layout root
    return { model, loaded, LayoutRoot, route, router };
  },
});
</script>
