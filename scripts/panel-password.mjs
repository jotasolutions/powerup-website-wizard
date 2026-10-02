/**
 * Contraseña del panel interno (/panel/{slug}).
 *
 * Crea una contraseña al azar (24 caracteres), la copia al portapapeles (macOS, pbcopy) y muestra
 * SOLO su huella, que va en PANEL_PASSWORD_FINGERPRINT (src/lib/panel-auth.server.ts).
 * La contraseña no se imprime: guárdala enseguida en el gestor de contraseñas.
 *
 * Ejecutar: node scripts/panel-password.mjs
 * Huella de una contraseña propia (16+ caracteres):
 *   printf '%s' 'la-contraseña' | node scripts/panel-password.mjs --stdin
 */
import { execFileSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";

const N = 16384;
const MIN_LENGTH = 16;

function fingerprint(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N, r: 8, p: 1 });
  return ["scrypt", N, 8, 1, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

if (process.argv.includes("--stdin")) {
  const password = await readStdin();
  if (password.length < MIN_LENGTH) {
    console.error(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    process.exit(1);
  }
  console.log(fingerprint(password));
} else {
  const password = randomBytes(18).toString("base64url");
  try {
    execFileSync("pbcopy", { input: password });
  } catch {
    console.error("No se pudo copiar al portapapeles (pbcopy es de macOS). Usa --stdin.");
    process.exit(1);
  }
  console.error("Contraseña copiada al portapapeles: guárdala ya en el gestor de contraseñas.");
  console.log(fingerprint(password));
}
