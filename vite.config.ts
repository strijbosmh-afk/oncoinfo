import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function manualChunks(id: string) {
  const normalizedHelperId = id.replace(/\\/g, "/");

  // Keep Rollup's shared interop/helper virtual modules in their own chunk.
  // Otherwise they can land inside a vendor chunk (e.g. vendor-charts) that the
  // vendor-react chunk imports, creating a circular chunk dependency and a
  // "Cannot access 'React' before initialization" crash in production.
  if (
    normalizedHelperId.includes("commonjsHelpers") ||
    normalizedHelperId.includes("vite/preload-helper") ||
    normalizedHelperId.includes("\0")
  ) {
    return "vendor-helpers";
  }

  if (!id.includes("node_modules")) return undefined;

  const normalizedId = id.replace(/\\/g, "/");

  if (
    normalizedId.includes("/node_modules/react/") ||
    normalizedId.includes("/node_modules/react-dom/") ||
    normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (
    normalizedId.includes("/node_modules/react-router") ||
    normalizedId.includes("/node_modules/@remix-run/")
  ) {
    return "vendor-router";
  }

  if (normalizedId.includes("/node_modules/@supabase/")) {
    return "vendor-supabase";
  }

  if (normalizedId.includes("/node_modules/@tanstack/")) {
    return "vendor-query";
  }

  if (
    normalizedId.includes("/node_modules/@radix-ui/") ||
    normalizedId.includes("/node_modules/cmdk/") ||
    normalizedId.includes("/node_modules/vaul/") ||
    normalizedId.includes("/node_modules/input-otp/") ||
    normalizedId.includes("/node_modules/react-day-picker/") ||
    normalizedId.includes("/node_modules/embla-carousel")
  ) {
    return "vendor-ui";
  }

  if (normalizedId.includes("/node_modules/jspdf/")) {
    return "vendor-jspdf";
  }

  if (normalizedId.includes("/node_modules/html2canvas/")) {
    return "vendor-html2canvas";
  }

  if (normalizedId.includes("/node_modules/dompurify/")) {
    return "vendor-dompurify";
  }

  if (
    normalizedId.includes("/node_modules/recharts/") ||
    normalizedId.includes("/node_modules/d3-") ||
    normalizedId.includes("/node_modules/victory-vendor/")
  ) {
    return "vendor-charts";
  }

  if (
    normalizedId.includes("/node_modules/react-hook-form/") ||
    normalizedId.includes("/node_modules/@hookform/") ||
    normalizedId.includes("/node_modules/zod/")
  ) {
    return "vendor-forms";
  }

  if (
    normalizedId.includes("/node_modules/i18next/") ||
    normalizedId.includes("/node_modules/react-i18next/")
  ) {
    return "vendor-i18n";
  }

  if (
    normalizedId.includes("/node_modules/react-markdown/") ||
    normalizedId.includes("/node_modules/rehype-") ||
    normalizedId.includes("/node_modules/remark-") ||
    normalizedId.includes("/node_modules/unified/") ||
    normalizedId.includes("/node_modules/micromark") ||
    normalizedId.includes("/node_modules/hast-") ||
    normalizedId.includes("/node_modules/mdast-")
  ) {
    return "vendor-markdown";
  }

  if (
    normalizedId.includes("/node_modules/@dnd-kit/") ||
    normalizedId.includes("/node_modules/sortablejs/")
  ) {
    return "vendor-dnd";
  }

  if (normalizedId.includes("/node_modules/lucide-react/")) {
    return "vendor-icons";
  }

  if (normalizedId.includes("/node_modules/date-fns/")) {
    return "vendor-date";
  }

  if (normalizedId.includes("/node_modules/mammoth/")) {
    return "vendor-docx";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "pwa-icon-192.png", "pwa-icon-512.png", "images/logo-rzt.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Always try the network first for page navigations so the
            // installed app picks up new deploys instead of a stale shell.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32 },
            },
          },
        ],
      },
      manifest: {
        name: "OncoInfo - Medicijnbibliotheek",
        short_name: "OncoInfo",
        description: "Compleet geneesmiddelenoverzicht voor oncologie",
        theme_color: "#6b2d5b",
        background_color: "#f5f0f7",
        display: "standalone",
        start_url: "/",
        orientation: "any",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
}));
