import type { WebsiteType } from "./place-profile.types";

export type CuratedPlaceFixture = {
  tag: string;
  place_id: string;
  fallback_name: string;
  expected_website_type: WebsiteType;
};

/** 5 locales fijos — uno por website_type (script etapa 1 + dev preview). */
export const ALTA_CURATED_PLACES: CuratedPlaceFixture[] = [
  {
    tag: "own",
    place_id: "ChIJfUIagAMpQg0RRYLx9K82nJc",
    fallback_name: "DiverXO",
    expected_website_type: "own",
  },
  {
    tag: "aggregator",
    place_id: "ChIJ-Z0QUwApQg0RrFuXWy9Dzz4",
    fallback_name: "Layali Bagdad",
    expected_website_type: "aggregator",
  },
  {
    tag: "social",
    place_id: "ChIJr6w91htsEg0RJ7OrcxZD8Eg",
    fallback_name: "Bodega Santa Cruz Las Columnas",
    expected_website_type: "social",
  },
  {
    tag: "builder",
    place_id: "ChIJe4ykUefmuhIRoM6YLAsKUEY",
    fallback_name: "8de7",
    expected_website_type: "builder",
  },
  {
    tag: "none",
    place_id: "ChIJ14hPdACjpBIRkvTWkvQ_ehk",
    fallback_name: "Pulponeta",
    expected_website_type: "none",
  },
];
