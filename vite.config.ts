import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "orb-hud.js"
    }
  }
});