import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/pixi.js") ||
            id.includes("node_modules/@pixi")
          )
            return "pixi";
          if (
            id.includes("node_modules/@xyflow") ||
            id.includes("node_modules/d3-")
          )
            return "editor";
        },
      },
    },
  },
});
