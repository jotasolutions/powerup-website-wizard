import type { PlaceProfile } from "./place-profile.types";

const GENERIC_CUISINE_LABELS = new Set([
  "restaurante",
  "bar",
  "cafetería",
  "cafeteria",
  "cafe",
  "café",
  "local",
  "establecimiento",
  "establecimiento de comida",
  "comida",
  "food",
  "restaurant",
  "coffee shop",
  "pub",
]);

export function formatPlaceRating(rating?: number): string | null {
  if (typeof rating !== "number" || Number.isNaN(rating)) return null;
  return `★${rating.toLocaleString("es-ES", { maximumFractionDigits: 1 })}`;
}

export function formatReviewCount(count?: number): string | null {
  if (typeof count !== "number" || count <= 0) return null;
  return `${count.toLocaleString("es-ES")} reseñas`;
}

export function shouldShowCuisineLabel(cuisineLabel?: string): boolean {
  const trimmed = cuisineLabel?.trim();
  if (!trimmed) return false;
  return !GENERIC_CUISINE_LABELS.has(trimmed.toLowerCase());
}

export function buildPlaceDataLine(profile: PlaceProfile): string | null {
  const parts: string[] = [];

  if (shouldShowCuisineLabel(profile.cuisine_label)) {
    parts.push(profile.cuisine_label!.trim());
  }

  const rating = formatPlaceRating(profile.rating);
  if (rating) parts.push(rating);

  const reviews = formatReviewCount(profile.review_count);
  if (reviews) parts.push(reviews);

  return parts.length > 0 ? parts.join(" · ") : null;
}
