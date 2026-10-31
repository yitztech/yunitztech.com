import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
    server: { allowedHosts: true },
  },
  devToolbar: { enabled: false },
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { port: 4321 },
  security: { checkOrigin: true },
});
