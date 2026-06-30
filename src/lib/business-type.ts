/** Término corto para copy del asistente (bar, cafetería, restaurante o genérico). */
export type BusinessTerm = "bar" | "cafetería" | "restaurante" | "local";

const BAR_TYPES = new Set([
  "bar",
  "pub",
  "wine_bar",
  "brewery",
  "brewpub",
  "cocktail_bar",
  "night_club",
  "bar_and_grill",
]);

const CAFE_TYPES = new Set([
  "cafe",
  "coffee_shop",
  "bakery",
  "tea_house",
  "dessert_shop",
  "ice_cream_shop",
  "donut_shop",
  "cafeteria",
  "sandwich_shop",
  "deli",
]);

const RESTAURANT_TYPES = new Set([
  "restaurant",
  "meal_takeaway",
  "meal_delivery",
  "fast_food_restaurant",
  "food_court",
  "food",
  "steak_house",
  "pizzeria",
]);

/** Tipos Google Places aceptados en la búsqueda GMB del wizard. */
export const HOSPITALITY_GOOGLE_TYPES = new Set([
  ...BAR_TYPES,
  ...CAFE_TYPES,
  ...RESTAURANT_TYPES,
  "pizza_restaurant",
  "breakfast_restaurant",
  "brunch_restaurant",
  "hamburger_restaurant",
  "seafood_restaurant",
  "mexican_restaurant",
  "italian_restaurant",
  "sushi_restaurant",
  "chinese_restaurant",
  "indian_restaurant",
  "japanese_restaurant",
  "thai_restaurant",
  "spanish_restaurant",
  "tapas_restaurant",
  "barbecue_restaurant",
  "vegan_restaurant",
  "vegetarian_restaurant",
]);

export function isHospitalityGoogleType(type: string): boolean {
  const t = type.toLowerCase();
  if (HOSPITALITY_GOOGLE_TYPES.has(t)) return true;
  if (t.endsWith("_restaurant")) return true;
  return false;
}

function matchesAnyType(types: string[], bucket: Set<string>): boolean {
  return types.some((t) => bucket.has(t.toLowerCase()));
}

function inferFromDisplayName(displayName?: string): BusinessTerm | null {
  if (!displayName) return null;
  const lower = displayName.toLowerCase();
  if (/\bbar\b|\bpub\b|\btaberna\b/.test(lower)) return "bar";
  if (/cafeter|coffee|cafe\b|panader|pasteler|boller/.test(lower)) return "cafetería";
  if (/restaurante|pizzer|mesón|asador|bistró|bistro|comida/.test(lower)) return "restaurante";
  return null;
}

/** Clasificación interna desde types[] y primaryTypeDisplayName. No reusar en copy al usuario:
 *  Google mete bar/cocktail_bar en types[] de muchos restaurantes (p. ej. Voltereta Manhattan → "bar").
 *  Los prompts y el resumen usan texto neutro; ver AGENTS.md § resolveBusinessTerm. */
export function resolveBusinessTerm(
  googleTypes: string[] | undefined,
  primaryTypeDisplayName?: string,
): BusinessTerm {
  const normalized = (googleTypes ?? []).map((t) => t.toLowerCase());

  if (matchesAnyType(normalized, BAR_TYPES)) return "bar";
  if (matchesAnyType(normalized, CAFE_TYPES)) return "cafetería";
  if (normalized.some(isHospitalityGoogleType)) return "restaurante";

  const fromLabel = inferFromDisplayName(primaryTypeDisplayName);
  if (fromLabel) return fromLabel;

  return "local";
}
