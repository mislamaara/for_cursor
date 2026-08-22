import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
<<<<<<< HEAD
=======
  base: process.env.GITHUB_ACTIONS ? "/for_cursor/" : "/",
>>>>>>> cursor/diet-fitness-assistant-6661
  plugins: [react()],
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
