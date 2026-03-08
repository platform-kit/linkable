import { createRouter, createWebHistory } from "vue-router";
import IndexPage from "./pages/Index.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: IndexPage,
    },
    {
      // Deep links (e.g. /about) should still bootstrap the SPA.
      // Layout-specific routing can then resolve inside the app.
      path: "/:pathMatch(.*)*",
      name: "spa-fallback",
      component: IndexPage,
    },
  ],
});

export default router;
