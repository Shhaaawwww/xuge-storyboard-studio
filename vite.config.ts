import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webPort = Number(process.env.WEB_PORT || 5173);
const apiPort = Number(process.env.PORT || 4317);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": `http://localhost:${apiPort}`
    }
  },
  preview: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": `http://localhost:${apiPort}`
    }
  }
});
