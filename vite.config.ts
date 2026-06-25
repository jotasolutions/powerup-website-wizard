// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tslibEsm = require.resolve("tslib/tslib.es6.mjs");

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        tslib: tslibEsm,
      },
    },
  },
  nitro: {
    preset: "vercel",
    alias: {
      tslib: tslibEsm,
    },
    noExternals: [
      "tslib",
      "@supabase/supabase-js",
      "@supabase/auth-js",
      "@supabase/functions-js",
      "@supabase/postgrest-js",
      "@supabase/realtime-js",
      "@supabase/storage-js",
      "@neondatabase/serverless",
      "drizzle-orm",
      "stripe",
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
