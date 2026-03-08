import { createApp } from "vue";

import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { plugin as formkitPlugin, defaultConfig } from "@formkit/vue";

import Aura from "@primevue/themes/aura";

import "./styles.css";
import "primeicons/primeicons.css";

import App from "./App.vue";
import router from "./router";
import { formkitConfig } from "./lib/formkit-config";

const app = createApp(App);
app.use(router);
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: Aura,
  },
});
app.use(ToastService);
app.use(formkitPlugin, defaultConfig(formkitConfig));

// Register PrimeVue tooltip directive globally
import Tooltip from "primevue/tooltip";
app.directive("tooltip", Tooltip);

app.mount("#app");