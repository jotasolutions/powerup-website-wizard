import type { PlaceProfile } from "./place-profile.types";
import {
  PLACE_GAP_AGGREGATOR_GENERIC,
  PLACE_GAP_MESSAGES,
  PLACE_GAP_PLATFORM_PLACEHOLDER,
  PLACE_GAP_SOCIAL_GENERIC,
} from "./place-gap.messages";
import { resolvePlatformLabel } from "./website-classifier";

/** Mensaje de brecha resuelto a partir del perfil enriquecido (función pura). */
export function resolvePlaceGapMessage(profile: PlaceProfile): string {
  const { website_type, website_uri } = profile;

  if (website_type === "none" || website_type === "builder" || website_type === "own") {
    return PLACE_GAP_MESSAGES[website_type];
  }

  const platform = resolvePlatformLabel(website_uri);
  if (platform) {
    return PLACE_GAP_MESSAGES[website_type].replaceAll(
      PLACE_GAP_PLATFORM_PLACEHOLDER,
      platform,
    );
  }

  return website_type === "aggregator"
    ? PLACE_GAP_AGGREGATOR_GENERIC
    : PLACE_GAP_SOCIAL_GENERIC;
}
