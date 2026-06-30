/**
 * Checkpoint B3 — prefetch en paralelo al enrichment (mock 500ms).
 * Ejecutar: node scripts/checkpoint-b3-live.mjs
 */
import { performance } from "node:perf_hooks";

async function mockCheckDomain() {
  await new Promise((r) => setTimeout(r, 500));
  return { available: true, price: 18.02 };
}

const enrichmentStepMs = [450, 450, 450];
let timeline = 0;
let prefetchDoneAt = 0;

console.log("=== Checkpoint B3 — prefetch dominio ===\n");

const prefetchStart = performance.now();
const prefetchPromise = mockCheckDomain().then((r) => {
  prefetchDoneAt = Math.round(performance.now() - prefetchStart);
  return r;
});

for (const [i, delay] of enrichmentStepMs.entries()) {
  timeline += delay;
  await new Promise((r) => setTimeout(r, delay));
  console.log(`+${delay}ms — paso enrichment ${i + 1}`);
}

const prefetchResult = await prefetchPromise;
const atElegirDominio = timeline;

console.log(`\nLlegada a elegirDominio: ~${atElegirDominio}ms desde pick`);
console.log(`Prefetch resuelto en: ${prefetchDoneAt}ms (en paralelo)`);
console.log(`Margen antes de elegirDominio: ${atElegirDominio - prefetchDoneAt}ms`);
console.log(`Resultado:`, prefetchResult);

const spinnerVisible = prefetchDoneAt > atElegirDominio;
console.log(`\nSpinner perceptible en elegirDominio: ${spinnerVisible ? "SÍ ❌" : "NO ✓"}`);

process.exit(spinnerVisible ? 1 : 0);
