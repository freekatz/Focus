import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import pkg from "./package.json";

// Allowed hosts for dev and preview servers
const ALLOWED_HOSTS = ["localhost", "127.0.0.1", "focus.1uvu.com", "focus.wlb.life"];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  const buildDate = new Date().toISOString().slice(0, 10);

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      outDir: "dist",
      sourcemap: !isProd,
      minify: isProd ? "esbuild" : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },
    server: {
      port: 8080,
      host: true,
      allowedHosts: ALLOWED_HOSTS,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 80,
      host: true,
      allowedHosts: ALLOWED_HOSTS,
    },
    appType: "spa",
  };
});
