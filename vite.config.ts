import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://www.uchat.com.au",
        changeOrigin: true,
        secure: true,
      },
      "/workspace-api": {
        target: "https://chat.talkbi.com.br",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/workspace-api/, "/api"),
      },
    },
  },
});
