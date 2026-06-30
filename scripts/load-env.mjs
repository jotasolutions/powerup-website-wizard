/**
 * Carga variables desde .env en la raíz del repo (mismo fichero que usa la app en local).
 * Sobrescribe claves ausentes o vacías en process.env — igual que dotenv con override de "".
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadProjectEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    return { loaded: false, path: envPath };
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const existing = process.env[key];
    if (existing !== undefined && existing !== "") continue;
    process.env[key] = val;
  }

  return { loaded: true, path: envPath };
}

loadProjectEnv();
