#!/usr/bin/env node
/**
 * Carga .env y ejecuta el runner TypeScript contra el código de enrichment real.
 * Uso: node scripts/test-place-enrichment.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const runner = resolve(__dirname, "test-place-enrichment-run.ts");
const result = spawnSync("npx", ["--yes", "tsx", runner], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
