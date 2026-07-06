/** Copy del asistente de alta — neutro por local; enumeración genérica solo en welcome/placeholder. */

import { formatEUR } from "./alta-config";

export const ALTA_WELCOME =
  "Hola, soy el asistente de PowerUp Menu. Vamos a montar la página web de tu local (restaurante, bar o cafetería) en unos pasos. ¿Empezamos?";

export const ALTA_SEARCH_BOT_PROMPT =
  "Busca tu local en Google y selecciónalo de la lista.";

export const ALTA_SEARCH_PLACEHOLDER = "Busca tu bar, restaurante o cafetería";

export const ALTA_NOT_IN_LIST_LINK = "Mi negocio no aparece o es nuevo";

/** Escape en paso encontrado — rechaza la ficha y vuelve a búsqueda (único reset completo). */
export const ALTA_WRONG_PLACE_LABEL = "No es este local";

/** En confirmarInfo — vuelve a encontrado sin limpiar perfil. */
export const ALTA_REVIEW_PLACE_LABEL = "Revisar ficha";

export const ALTA_MANUAL_NAME_LABEL = "Nombre del local";

export const ALTA_MANUAL_NAME_PLACEHOLDER = "Ej. Bar La Plaza, Cafetería Sol…";

export const ALTA_SUGGESTIONS_TITLE = "Elige tu local";

export const ALTA_SUGGESTIONS_HINT_CHAT = "Desliza y elige tu local";

export const ALTA_SEARCH_ERROR = "No se pudo buscar tu local. Inténtalo de nuevo.";

export const ALTA_ORDER_DETAIL_LABEL = "Local";

export const ALTA_SEO_DESCRIPTION =
  "Crea la página web de tu restaurante, bar o cafetería en unos pasos con PowerUp Menu. Incluida en el Plan Pro Anual con 1 mes de prueba gratis.";

export const ALTA_SEO_OG_DESCRIPTION =
  "Tu página web de hostelería lista en minutos. Incluida en el Plan Pro Anual con 1 mes de prueba gratis.";

export const ALTA_ROOT_DESCRIPTION =
  "Alta de página web para tu restaurante, bar o cafetería con PowerUp Menu.";

export const ALTA_SUPPORT_BUSINESS_LABEL = "Local";

export function formatConfirmInfoPrompt(): string {
  return "¿Es correcta esta información?";
}

export function formatEncontradoLoadingLabel(): string {
  return "Un momento…";
}

export function formatEncontradoBotPrompt(): string {
  return "Estamos mirando tu ficha en Google…";
}

export function formatOrderDetailLabel(): string {
  return ALTA_ORDER_DETAIL_LABEL;
}

export function formatSupportBusinessLabel(): string {
  return ALTA_SUPPORT_BUSINESS_LABEL;
}

// ─── Dominio (etapa 6) ─────────────────────────────────────────────────────

export const ALTA_DOMAIN_BOT_PROMPT =
  "¿Qué dominio te gustaría? Si ya hemos comprobado uno, te lo mostramos listo.";

export const ALTA_DOMAIN_SEARCH_PLACEHOLDER = "turestaurante.es";

export const ALTA_DOMAIN_USE_SUGGESTION_CTA = "Usar este dominio";

export const ALTA_DOMAIN_CHECK_CTA = "Comprobar dominio";

export const ALTA_DOMAIN_OTHER_ALTERNATIVES_LABEL = "Otras opciones disponibles";

export const ALTA_DOMAIN_DEGRADED_BANNER =
  "No pudimos comprobar dominios ahora mismo. Puedes intentar otro nombre o continuar con la dirección gratis.";

export function formatDomainPrefetchLoading(candidate: string): string {
  return `Comprobando ${candidate}…`;
}

/** Candidato .es libre — solución directa. */
export function formatDomainAvailableLine(domain: string, price: number): string {
  return `“${domain}” está disponible por ${formatEUR(price)}`;
}

/** Primera alternativa promovida cuando el .es exacto está cogido — encuadre solución, no error. */
export function formatDomainSuggestionLine(domain: string, price: number): string {
  return `Te sugerimos “${domain}” por ${formatEUR(price)}`;
}

export function formatDomainSkipLabel(freeSubdomain: string): string {
  return `Continuar con ${freeSubdomain} (gratis)`;
}

// ─── Contacto / GDPR ─────────────────────────────────────────────────────────

export const ALTA_CONTACT_REASSURANCE_CHIPS = ["Solo WhatsApp", "Sin spam"] as const;

export const ALTA_TERMS_CHECKBOX_PREFIX = "He leído y acepto las ";

export const ALTA_TERMS_CHECKBOX_LINK = "condiciones y la política de privacidad";

export const ALTA_CONTACT_SAVE_HINT = "Lo guardamos por si quieres retomarlo más tarde.";

export const ALTA_CONTACT_STRIPE_NOTE =
  "Después solo guardas tu tarjeta de forma segura (Stripe) para activar la prueba gratis.";
