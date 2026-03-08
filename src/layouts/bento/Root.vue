<template>
  <div class="min-h-dvh bg-[var(--bg)] flex flex-col">
    <ProfileHeader
      :displayName="model.profile.displayName"
      :tagline="model.profile.tagline"
      :avatarSrc="model.theme.layoutData?.avatarUrl || ''"
      :bannerSrc="model.theme.layoutData?.bannerUrl || ''"
      :initials="model.profile.displayName?.split(' ').map(n => n[0]).join('') || ''"
      :socials="model.collections.socials?.items || []"
    />
    <TabNav
      :visible="true"
      :activeTab="activeTab"
      :tabs="tabs"
      @switch="onTabSwitch"
    />
    <div>
      <LinksSection
        v-if="activeTab === 'links'"
        :links="model.collections.links?.items || []"
        :searchEnabled="model.collections.links?.searchEnabled || false"
        :availableTags="[]"
        :selectedTags="[]"
      />
      <ResumeSection
        v-if="activeTab === 'resume'"
        :resume="model.collections.resume?.items[0] || {}"
      />
      <GallerySection
        v-if="activeTab === 'gallery'"
        :items="model.collections.gallery?.items || []"
        :searchEnabled="model.collections.gallery?.searchEnabled || false"
        :availableTags="[]"
        :selectedTags="[]"
        :gridCols="model.theme.layoutData?.grid?.columns || 4"
      />
      <BlogSection
        v-if="activeTab === 'blog'"
        :posts="model.collections.blog?.items || []"
        :currentPost="null"
        :label="model.collections.blog?.label || 'Articles'"
        :searchEnabled="model.collections.blog?.searchEnabled || false"
        :availableTags="[]"
        :selectedTags="[]"
      />
      <EmbedSection
        v-if="activeTab === 'embeds'"
        :html="''"
      />
      <NewsletterSection
        v-if="activeTab === 'newsletter'"
        :searchEnabled="model.collections.newsletter?.searchEnabled || false"
        :availableTags="[]"
        :selectedTags="[]"
      />
    </div>
    <PageFooter :showRss="true" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ProfileHeader from "./ProfileHeader.vue";
import TabNav from "./TabNav.vue";
import LinksSection from "./LinksSection.vue";
import ResumeSection from "./ResumeSection.vue";
import GallerySection from "./GallerySection.vue";
import BlogSection from "./BlogSection.vue";
import EmbedSection from "./EmbedSection.vue";
import NewsletterSection from "./NewsletterSection.vue";
import PageFooter from "./PageFooter.vue";

export default defineComponent({
  name: "Root",
  props: {
    model: { type: Object, required: true },
    layoutData: { type: Object, default: () => ({}) },
    route: { type: Object, required: false },
    router: { type: Object, required: false },
  },
  components: {
    ProfileHeader,
    TabNav,
    LinksSection,
    ResumeSection,
    GallerySection,
    BlogSection,
    EmbedSection,
    NewsletterSection,
    PageFooter,
  },
  data() {
    // Determine initial tab from route
    let initialTab = 'links';
    const path = this.route?.path || '/';
    if (path === '/about') initialTab = 'resume';
    else if (path === '/gallery') initialTab = 'gallery';
    else if (path === '/blog') initialTab = 'blog';
    else if (path === '/embeds') initialTab = 'embeds';
    else if (path === '/newsletter') initialTab = 'newsletter';
    else if (path.startsWith('/content/')) initialTab = 'blog';
    return {
      activeTab: initialTab,
      tabs: [
        { key: 'links', label: 'All', icon: 'Link' },
        { key: 'resume', label: 'About Me', icon: 'FileText' },
        { key: 'gallery', label: 'My Work', icon: 'Image' },
        { key: 'blog', label: 'Articles', icon: 'BookOpen' },
        { key: 'embeds', label: 'Embeds', icon: 'Code' },
        { key: 'newsletter', label: 'Newsletter', icon: 'Mail' },
      ],
    };
  },
  methods: {
    onTabSwitch(tabKey: string) {
      this.activeTab = tabKey;
      // Navigate to correct route
      if (this.router) {
        if (tabKey === 'links') this.router.push('/');
        else if (tabKey === 'resume') this.router.push('/about');
        else if (tabKey === 'gallery') this.router.push('/gallery');
        else if (tabKey === 'blog') this.router.push('/blog');
        else if (tabKey === 'embeds') this.router.push('/embeds');
        else if (tabKey === 'newsletter') this.router.push('/newsletter');
      }
    },
  },
});
</script>

<style scoped>
/* Add layout-specific styles here */
</style>
