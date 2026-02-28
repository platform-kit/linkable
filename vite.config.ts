import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [vue()],
}));
