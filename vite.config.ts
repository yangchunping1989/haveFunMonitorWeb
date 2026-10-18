import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "ADMIN_API_");
  const apiTarget = process.env.ADMIN_API_TARGET || env.ADMIN_API_TARGET || "http://127.0.0.1:8080";
  return {
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/emoji": { target: apiTarget },
      "/api": {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          "element-plus": ["element-plus"],
          charts: [
            "echarts/core",
            "echarts/charts",
            "echarts/components",
            "echarts/renderers",
          ],
        },
      },
    },
  },
  };
});
