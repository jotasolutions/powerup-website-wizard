import { describe, expect, it } from "vitest";
import { isHospitalityGoogleType, resolveBusinessTerm } from "./business-type";

describe("resolveBusinessTerm", () => {
  it("bar desde types", () => {
    expect(resolveBusinessTerm(["bar", "point_of_interest"], "Bar")).toBe("bar");
    expect(resolveBusinessTerm(["pub"], "Pub")).toBe("bar");
  });

  it("cafetería desde types", () => {
    expect(resolveBusinessTerm(["cafe", "food"], "Cafetería")).toBe("cafetería");
    expect(resolveBusinessTerm(["coffee_shop"], "Café")).toBe("cafetería");
  });

  it("restaurante desde types", () => {
    expect(resolveBusinessTerm(["restaurant"], "Restaurante")).toBe("restaurante");
    expect(resolveBusinessTerm(["italian_restaurant"], "Restaurante italiano")).toBe(
      "restaurante",
    );
  });

  it("infiere desde primaryTypeDisplayName si types vacíos", () => {
    expect(resolveBusinessTerm([], "Bar de tapas")).toBe("bar");
    expect(resolveBusinessTerm(undefined, "Cafetería")).toBe("cafetería");
  });

  it("fallback local", () => {
    expect(resolveBusinessTerm(["store"], "Tienda")).toBe("local");
    expect(resolveBusinessTerm()).toBe("local");
  });
});

describe("isHospitalityGoogleType", () => {
  it("acepta restaurant y sufijos _restaurant", () => {
    expect(isHospitalityGoogleType("restaurant")).toBe(true);
    expect(isHospitalityGoogleType("mexican_restaurant")).toBe(true);
  });

  it("rechaza tipos ajenos", () => {
    expect(isHospitalityGoogleType("grocery_store")).toBe(false);
  });
});
