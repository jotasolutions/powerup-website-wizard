import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tslibEsm = require.resolve("tslib/tslib.es6.mjs");

export default defineConfig({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    proxy: {
      "/ingest/static": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
        secure: false,
      },
      "/ingest/array": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
        secure: false,
      },
      "/ingest": {
        target: "https://eu.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      tslib: tslibEsm,
    },
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: "vercel",
      alias: {
        tslib: tslibEsm,
      },
      noExternals: ["tslib", "@neondatabase/serverless", "drizzle-orm", "stripe"],
    }),
    viteReact(),
  ],
});
