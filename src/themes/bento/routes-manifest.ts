import type { LayoutRoute } from "../../lib/layout-manifest";
import Root from "./Root.vue";

const routes: LayoutRoute[] = [
  {
    path: "/",
    component: () => Promise.resolve({ default: Root }),
    label: "All",
    icon: "Link",
  },
  {
    path: "/about",
    component: () => Promise.resolve({ default: Root }),
    label: "About Me",
    icon: "FileText",
  },
  {
    path: "/gallery",
    component: () => Promise.resolve({ default: Root }),
    label: "My Work",
    icon: "Image",
  },
  {
    path: "/blog",
    component: () => Promise.resolve({ default: Root }),
    label: "Articles",
    icon: "BookOpen",
  },
  {
    path: "/embeds",
    component: () => Promise.resolve({ default: Root }),
    label: "Embeds",
    icon: "Code",
  },
  {
    path: "/newsletter",
    component: () => Promise.resolve({ default: Root }),
    label: "Newsletter",
    icon: "Mail",
  },
  {
    path: "/newsletter/:id",
    component: () => Promise.resolve({ default: Root }),
    label: "Newsletter Article",
    icon: "Mail",
  },
  {
    path: "/confirmed",
    component: () => Promise.resolve({ default: Root }),
    label: "Newsletter Confirmation",
    icon: "CheckCircle",
  },
  {
    path: "/content/:slug",
    component: () => Promise.resolve({ default: Root }),
    label: "Blog Article",
    icon: "BookOpen",
  },
  {
    path: "/docs",
    component: () => Promise.resolve({ default: Root }),
    label: "Docs",
    icon: "BookMarked",
  },
  {
    path: "/docs/:slug(.*)",
    component: () => Promise.resolve({ default: Root }),
    label: "Doc Page",
    icon: "BookMarked",
  },
];

export default routes;
