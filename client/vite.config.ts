import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg", "offline.html", "icon-192.png", "icon-512.png"],
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "MFARPS — Municipal Fisherfolk & Boat Permit System",
        short_name: "MFARPS",
        description:
          "Permit management for fisherfolk in the Municipality of Dr. Jose P. Rizal, Palawan.",
        theme_color: "#1d4ed8",
        background_color: "#0b1f4a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,ico,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "mfarps-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4001",
    },
  },
});
