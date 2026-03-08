import { defineComponent, computed, provide, ref } from "vue";
import { useComponent } from "../lib/component-resolver";
import { defaultModel, type BioModel } from "../lib/model";

// Default user-facing components (overridable via src/overrides/)
import DefaultProfileHeader from "../components/ProfileHeader.vue";
import DefaultTabNav from "../components/TabNav.vue";
import DefaultLinksSection from "../components/LinksSection.vue";
import DefaultResumeSection from "../components/ResumeSection.vue";
import DefaultGallerySection from "../components/GallerySection.vue";
import DefaultBlogSection from "../components/BlogSection.vue";
import DefaultEmbedSection from "../components/EmbedSection.vue";
import DefaultNewsletterSection from "../components/NewsletterSection.vue";
import DefaultNewsletterViewPage from "../components/NewsletterViewPage.vue";
import DefaultLightboxOverlay from "../components/LightboxOverlay.vue";
import DefaultVideoOverlay from "../components/VideoOverlay.vue";
import DefaultPageFooter from "../components/PageFooter.vue";

export default defineComponent({
  name: "IndexPage",
  setup() {
    const model = ref<BioModel>(defaultModel());
    provide("bioModel", model);
    const activeLayout = computed(() => model.value.theme.layout || "default");

    // Resolve the main layout root component (e.g. Bento)
    const LayoutRoot = useComponent("Root", null, activeLayout);

    // Fallback: render a minimal message if no layout root is found
    return () =>
      LayoutRoot.value
        ? (
            <LayoutRoot.value model={model.value} layout-data={model.value.theme.layoutData} />
          )
        : (
            <div class="flex min-h-dvh items-center justify-center text-xl text-gray-400">
              No layout found.
            </div>
          );
  },
});
