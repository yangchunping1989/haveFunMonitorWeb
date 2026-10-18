import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import "./style.css";
import App from "./App.vue";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/overview" },
    { path: "/word-batches", component: () => import("./WordBatches.vue") },
    { path: "/emoji", component: () => import("./EmojiQuality.vue") },
    {
      path: "/:section(overview|analytics|suggestions|feedback|words|jobs|gomoku|skills|loadouts)",
      component: () => import("./Dashboard.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/overview" },
  ],
});
createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus, { locale: zhCn })
  .mount("#app");
