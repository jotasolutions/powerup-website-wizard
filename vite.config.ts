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
    port: 8080,
    strictPort: false,
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
