import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    // 生产构建配置
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
    // 开发服务器配置
    server: {
      port: 8080,
      host: true,
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "focus.1uvu.com",
        "focus.wlb.life",
      ],
      proxy: {
        "/api": {
          target: env.VITE_API_BASE || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // 预览服务器配置（生产构建预览）
    preview: {
      port: 80,
      host: true,
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "focus.1uvu.com",
        "focus.wlb.life",
      ],
    },
    // SPA 路由回退
    appType: "spa",
  };
});
