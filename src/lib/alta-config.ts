// Configuración del flujo de alta. Importes/precios configurables.
// Cuando MOCK_MODE = false, las edge functions llaman a APIs reales (Google Places,
// registrador de dominios, Stripe). Mientras esté en true, devuelven datos falsos.

export const MOCK_MODE = true;

// Importe de referencia del plan Pro Anual (incluye Página Web). No codificar
// importes finales en Stripe: el Stripe Price ID será un secreto cuando se integre real.
export const PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR = 300;
export const PLAN_PRO_ANUAL_DIAS_PRUEBA = 30;

// Fee de gestión cuando el restaurante ya tiene su propia web (pago único hoy).
export const FEE_GESTION_WEB_PROPIA_EUR = 49;

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

// Genera un subdominio a partir del nombre del restaurante.
export function generarSubdominio(nombre: string): string {
  const slug = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  return `${slug || "tu-restaurante"}.powerup.menu`;
}
