import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// During `vite dev` the Svelte app runs on :5173 and the API on :8787.
// Proxy /api so cookies are first-party and there are no CORS concerns.
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
