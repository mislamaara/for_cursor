import { copyFileSync, existsSync } from "node:fs";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

function spaFallback(): Plugin {
  return {
    name: "spa-github-pages-fallback",
    closeBundle() {
      if (!existsSync("dist/index.html")) return;
      copyFileSync("dist/index.html", "dist/404.html");
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/for_cursor/" : "/",
  plugins: [react(), spaFallback()],
  test: {
    environment: "jsdom",
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
});
