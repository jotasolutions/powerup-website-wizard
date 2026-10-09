import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAMPAIGN_STORAGE_KEY,
  CAMPAIGN_VALUE_MAX,
  CampaignSchema,
  campaignFromSearch,
  campaignFromStripeMetadata,
  campaignMetadata,
  hasCampaign,
  rememberCampaign,
} from "./campaign-attribution";

const META_URL =
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=tanda1-2026-10&utm_content=h3-a&utm_term=Instagram_Stories";

describe("campaignFromSearch", () => {
  it("se queda con las cinco UTM", () => {
    expect(campaignFromSearch(META_URL)).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "tanda1-2026-10",
      utm_content: "h3-a",
      utm_term: "Instagram_Stories",
    });
  });

  it("ignora otros parámetros, vacíos y espacios", () => {
    expect(
      campaignFromSearch(
        "?fbclid=abc&cancelado=1&utm_source=%20facebook%20&utm_medium=&email=x@y.z",
      ),
    ).toEqual({ utm_source: "facebook" });
  });

  it("recorta valores demasiado largos", () => {
    const largo = "x".repeat(CAMPAIGN_VALUE_MAX + 50);
    expect(campaignFromSearch(`?utm_content=${largo}`).utm_content).toHaveLength(
      CAMPAIGN_VALUE_MAX,
    );
  });

  it("sin campaña devuelve un objeto vacío", () => {
    expect(campaignFromSearch("")).toEqual({});
    expect(hasCampaign(campaignFromSearch("?cancelado=1"))).toBe(false);
  });
});

describe("rememberCampaign", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recuerda la campaña de la URL de llegada", () => {
    expect(rememberCampaign(META_URL).utm_content).toBe("h3-a");
    expect(store.has(CAMPAIGN_STORAGE_KEY)).toBe(true);
  });

  it("la recupera al volver de Stripe sin parámetros", () => {
    rememberCampaign(META_URL);
    expect(rememberCampaign("?cancelado=1")).toEqual(campaignFromSearch(META_URL));
  });

  it("una campaña nueva sustituye a la anterior", () => {
    rememberCampaign(META_URL);
    expect(rememberCampaign("?utm_source=google&utm_campaign=otra")).toEqual({
      utm_source: "google",
      utm_campaign: "otra",
    });
  });

  it("descarta lo guardado si no es una campaña válida", () => {
    store.set(CAMPAIGN_STORAGE_KEY, JSON.stringify({ utm_source: "facebook", email: "x@y.z" }));
    expect(rememberCampaign("")).toEqual({});
  });

  it("sin sessionStorage sigue con lo que trae la URL", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(rememberCampaign(META_URL).utm_content).toBe("h3-a");
    expect(rememberCampaign("")).toEqual({});
  });
});

describe("CampaignSchema", () => {
  it("acepta solo las claves de campaña", () => {
    expect(CampaignSchema.safeParse({ utm_source: "facebook" }).success).toBe(true);
    expect(CampaignSchema.safeParse({ utm_source: "facebook", whatsapp: "600" }).success).toBe(
      false,
    );
    expect(
      CampaignSchema.safeParse({ utm_content: "x".repeat(CAMPAIGN_VALUE_MAX + 1) }).success,
    ).toBe(false);
  });
});

describe("campaignMetadata y campaignFromStripeMetadata", () => {
  it("solo pares con valor", () => {
    expect(campaignMetadata({ utm_source: "facebook", utm_term: "" })).toEqual({
      utm_source: "facebook",
    });
    expect(campaignMetadata(undefined)).toEqual({});
  });

  it("lee la campaña de los metadatos de Stripe sin arrastrar el resto", () => {
    expect(
      campaignFromStripeMetadata({
        alta_id: "alta-123",
        restaurant_name: "Bar Test",
        utm_campaign: "tanda1-2026-10",
        utm_content: "h3-b",
      }),
    ).toEqual({ utm_campaign: "tanda1-2026-10", utm_content: "h3-b" });
    expect(campaignFromStripeMetadata(null)).toEqual({});
  });
});
