// Configuración del flujo de alta. Importes/precios configurables.
// Búsqueda de restaurantes: Google Places API (ver env.server.ts).
// Dominios personalizados: Namecheap (ver env.server.ts → shouldMockDomainCheck).
export const DOMAIN_PRICE_MARGIN_PERCENT = 20;

// Importe de referencia del plan Pro Anual (incluye Página Web). No codificar
// importes finales en Stripe: el Stripe Price ID será un secreto cuando se integre real.
export const PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR = 300;
export const PLAN_PRO_ANUAL_DIAS_PRUEBA = 30;

// Fee de gestión cuando el restaurante ya tiene su propia web (pago único hoy).
export const FEE_GESTION_WEB_PROPIA_EUR = 49;

/** Activa el escenario management_fee en checkout. Apagado por defecto (etapa 5). */
export const ENABLE_MANAGEMENT_FEE = false;

/** Versión del documento legal mostrado en el checkbox de contacto (bump manual al cambiar). */
export const TERMS_VERSION = "2026-06";

/** Enlace único condiciones + privacidad. Override: VITE_LEGAL_URL en build. */
export const TERMS_AND_PRIVACY_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_LEGAL_URL &&
    String(import.meta.env.VITE_LEGAL_URL)) ||
  "https://powerup.menu/legal";

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Slug URL-safe a partir del nombre del local (compartido por subdominio y dominio .es). */
export function restaurantNameToSlug(nombre: string): string {
  const slug = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  return slug || "tu-restaurante";
}

// Genera un subdominio a partir del nombre del restaurante.
export function generarSubdominio(nombre: string): string {
  return `${restaurantNameToSlug(nombre)}.powerup.menu`;
}

/** Candidato único para prefetch Namecheap (mercado ES). */
export function suggestPrimaryCustomDomain(nombre: string): string {
  return `${restaurantNameToSlug(nombre)}.es`;
}
