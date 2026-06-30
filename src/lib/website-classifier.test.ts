import { describe, expect, it } from "vitest";
import {
  classifyWebsite,
  classifyWebsiteDetailed,
  extractPowerUpMenuDomain,
  isPowerUpMenuUri,
  resolvePlatformLabel,
} from "./website-classifier";

describe("resolvePlatformLabel", () => {
  it("linktr.ee → Linktree", () => {
    expect(resolvePlatformLabel("https://linktr.ee/mirestaurante")).toBe("Linktree");
  });

  it("dominio desconocido → undefined", () => {
    expect(resolvePlatformLabel("https://foo.com")).toBeUndefined();
  });

  it("URI vacía → undefined", () => {
    expect(resolvePlatformLabel("")).toBeUndefined();
    expect(resolvePlatformLabel(undefined)).toBeUndefined();
  });
});

describe("classifyWebsiteDetailed", () => {
  it("aggregator con marca conocida", () => {
    expect(classifyWebsiteDetailed("https://glovoapp.com/es/restaurant")).toEqual({
      website_type: "aggregator",
      platform_label: "Glovo",
    });
  });

  it("social con marca conocida", () => {
    expect(classifyWebsiteDetailed("https://instagram.com/restaurante")).toEqual({
      website_type: "social",
      platform_label: "Instagram",
    });
  });

  it("own sin platform_label", () => {
    expect(classifyWebsiteDetailed("https://www.diverxo.com")).toEqual({
      website_type: "own",
      platform_label: undefined,
    });
  });

  it("classifyWebsite sigue siendo compatible", () => {
    expect(classifyWebsite("https://restaurant8de7.wixsite.com/foo")).toBe("builder");
    expect(classifyWebsite("https://linktr.ee/x")).toBe("aggregator");
  });
});

describe("isPowerUpMenuUri", () => {
  it("subdominio powerup.menu", () => {
    expect(isPowerUpMenuUri("https://diverxo.powerup.menu")).toBe(true);
  });

  it("dominio ajeno no es powerup", () => {
    expect(isPowerUpMenuUri("https://www.diverxo.com")).toBe(false);
  });
});

describe("extractPowerUpMenuDomain", () => {
  it("extrae host del subdominio", () => {
    expect(extractPowerUpMenuDomain("https://bar-la-plaza.powerup.menu/carta")).toBe(
      "bar-la-plaza.powerup.menu",
    );
  });
});
