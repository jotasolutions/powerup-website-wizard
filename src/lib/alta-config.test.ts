import { describe, expect, it } from "vitest";
import {
  generarSubdominio,
  restaurantNameToSlug,
  suggestPrimaryCustomDomain,
} from "./alta-config";

describe("restaurantNameToSlug", () => {
  it("normaliza nombre con espacios y acentos", () => {
    expect(restaurantNameToSlug("Voltereta Kioto")).toBe("voltereta-kioto");
    expect(restaurantNameToSlug("Café Ñoño")).toBe("cafe-nono");
  });

  it("elimina símbolos y colapsa guiones", () => {
    expect(restaurantNameToSlug("Bar!!! La   Plaza")).toBe("bar-la-plaza");
  });

  it("usa fallback si el slug queda vacío", () => {
    expect(restaurantNameToSlug("!!!")).toBe("tu-restaurante");
    expect(restaurantNameToSlug("")).toBe("tu-restaurante");
  });
});

describe("suggestPrimaryCustomDomain", () => {
  it("devuelve {slug}.es", () => {
    expect(suggestPrimaryCustomDomain("Voltereta Kioto")).toBe("voltereta-kioto.es");
  });

  it("comparte slug con generarSubdominio", () => {
    const name = "Bar La Plaza";
    expect(suggestPrimaryCustomDomain(name)).toBe(`${restaurantNameToSlug(name)}.es`);
    expect(generarSubdominio(name)).toBe(`${restaurantNameToSlug(name)}.powerup.menu`);
  });
});
