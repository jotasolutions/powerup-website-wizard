import { describe, expect, it } from "vitest";
import {
  defaultAppEnvForPanel,
  shouldShowDevProductionEnvBanner,
} from "./analytics-panel-env";

describe("analytics-panel-env", () => {
  it("defaultAppEnvForPanel usa all en dev y production en prod", () => {
    expect(defaultAppEnvForPanel(true)).toBe("all");
    expect(defaultAppEnvForPanel(false)).toBe("production");
  });

  it("shouldShowDevProductionEnvBanner solo en dev con filtro producción", () => {
    expect(shouldShowDevProductionEnvBanner(true, "production")).toBe(true);
    expect(shouldShowDevProductionEnvBanner(true, "all")).toBe(false);
    expect(shouldShowDevProductionEnvBanner(false, "production")).toBe(false);
  });
});
