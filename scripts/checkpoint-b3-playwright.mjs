/**
 * Checkpoint B3 — wizard real en http://localhost:8082 (MOCK_DOMAIN_CHECK=true).
 * node scripts/checkpoint-b3-playwright.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.CHECKPOINT_URL ?? "http://localhost:8082";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const spinnerSeen = { value: false };
  page.on("response", () => {});

  console.log("=== Checkpoint B3 — wizard real ===\n");
  await page.goto(BASE, { waitUntil: "networkidle" });

  // Alta manual (no depende de GMB search)
  await page.getByRole("button", { name: /no aparece o es nuevo/i }).click();
  await page.getByLabel(/nombre del local/i).fill("Voltereta Kioto");
  await page.getByRole("button", { name: /continuar/i }).click();

  // Prefetch arranca aquí — dar tiempo mínimo de enrichment
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: /sí, es este/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /confirmar/i }).first().click();
  await page.waitForTimeout(300);

  const tBeforeDomain = Date.now();
  await page.getByRole("button", { name: /dominio personalizado/i }).click();

  // ¿Spinner de prefetch al montar?
  const loadingLocator = page.getByText(/comprobando .+\.es/i);
  if (await loadingLocator.isVisible({ timeout: 100 }).catch(() => false)) {
    spinnerSeen.value = true;
    await loadingLocator.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }

  const msToSuggestion = Date.now() - tBeforeDomain;
  const suggestionVisible = await page
    .getByText(/está disponible|te sugerimos/i)
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  const suggestionText = suggestionVisible
    ? await page.getByText(/está disponible|te sugerimos/i).first().textContent()
    : null;

  console.log(`Tiempo hasta sugerencia visible: ${msToSuggestion}ms`);
  console.log(`Spinner prefetch visible al entrar: ${spinnerSeen.value ? "SÍ" : "NO"}`);
  console.log(`Card de sugerencia visible: ${suggestionVisible ? "SÍ ✓" : "NO ❌"}`);
  if (suggestionText) console.log(`Texto: ${suggestionText.trim()}`);

  // QueryKey isolation: reset + otro restaurante
  await page.getByRole("button", { name: /no es este local/i }).click();
  await page.getByRole("button", { name: /no aparece o es nuevo/i }).click();
  await page.getByLabel(/nombre del local/i).fill("DiverXO");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /sí, es este/i }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /confirmar/i }).first().click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /dominio personalizado/i }).click();

  const inputValue = await page.locator('input[placeholder*="turestaurante"]').inputValue();
  const diverxoOk = inputValue.includes("diverxo");
  console.log(`\nQueryKey isolation — input tras cambio: "${inputValue}" → ${diverxoOk ? "OK ✓" : "FALLO ❌"}`);

  await browser.close();

  const pass = suggestionVisible && !spinnerSeen.value && diverxoOk;
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
