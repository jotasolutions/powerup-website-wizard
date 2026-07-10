import { describe, expect, it } from "vitest";
import { isEnvComparisonComparable } from "./neon-env-filter.server";

describe("isEnvComparisonComparable", () => {
  it("siempre comparable con filtro Todos", () => {
    expect(isEnvComparisonComparable("all", { columnReady: false })).toBe(true);
    expect(isEnvComparisonComparable("all", { columnReady: true })).toBe(true);
  });

  it("producción solo comparable cuando Neon tiene app_env listo", () => {
    expect(isEnvComparisonComparable("production", { columnReady: false })).toBe(false);
    expect(isEnvComparisonComparable("production", { columnReady: true })).toBe(true);
  });
});
