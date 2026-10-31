import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  // `npm run dev:ui` usa a API do `wrangler dev` (porta 8787).
  server: { proxy: { "/api": "http://localhost:8787" } },
});
