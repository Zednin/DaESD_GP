import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL || "http://localhost:8000";

  return defineConfig({
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      cors: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => { // Ensure the correct host and protocol are forwarded otherwise Django's CSRF protection may block requests and google OAUTH may fail due to incorrect callback URL
              proxyReq.setHeader("X-Forwarded-Host", "localhost:8000");
              proxyReq.setHeader("X-Forwarded-Port", "8000");
              proxyReq.setHeader("X-Forwarded-Proto", "http");
            });
          },
        },
      },
    },
  });
};