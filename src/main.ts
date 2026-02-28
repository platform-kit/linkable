import { createApp } from "vue";
import PrimeVue from "primevue/config";

import "./styles.css";
import "primeicons/primeicons.css";

import App from "./App.vue";

createApp(App)
  .use(PrimeVue, {
    ripple: true,
  })
  .mount("#app");
