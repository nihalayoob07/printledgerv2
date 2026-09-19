import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds to ONE self-contained index.html so the app keeps deploying the way
// it always has: copy the file anywhere and open it. No server required.
export default defineConfig({
  plugins: [react(), tailwind(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
});
