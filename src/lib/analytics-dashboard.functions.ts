import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  countAltaFulfilledInRange,
  countAltaLeadSavedInRange,
  queryCheckoutScenarioFunnel,
  queryEventTrendWeekly,
  queryFunnel,
  type DashboardAppEnvFilter,
} from "./analytics-posthog.server";
import {
  countNeonPaidInLastDays,
  getLeadToPaidCvr14d,
  getWeeklyPaidMetrics,
} from "./analytics-neon.server";
import {
  getCheckoutScenarioInstrumentedSince,
  getInternalAnalyticsPanelSlug,
  getInternalAnalyticsReplayUrl,
} from "./env.server";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "./analytics-panel.constants";

export type TileResult<T> = { ok: true; data: T } | { ok: false; error: string };

const DashboardInput = z.object({
  rangeDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  appEnv: z.enum(["production", "all"]).default("production"),
});

export type CvrLeadPaidData = Awaited<ReturnType<typeof getLeadToPaidCvr14d>> & {
  posthogLeads: number | null;
  posthogLeadsError?: string;
};

export type AnalyticsDashboardPayload = {
  meta: {
    rangeDays: number;
    appEnv: DashboardAppEnvFilter;
    replayUrl: string | null;
    checkoutScenarioSince: string;
    panelSlug: string;
  };
  row1: {
    weeklyRevenue: TileResult<{ current: number; previous: number }>;
    weeklyTrials: TileResult<{ current: number; previous: number }>;
    cvrLeadPaid: TileResult<CvrLeadPaidData>;
  };
  row2: {
    funnelServer: TileResult<{ steps: Array<{ event: string; count: number }> }>;
    funnelWizard: TileResult<{ steps: Array<{ event: string; count: number }> }>;
  };
  row3: {
    gmbErrors: TileResult<Awaited<ReturnType<typeof queryEventTrendWeekly>> extends infer R
      ? R extends { ok: true; data: infer D }
        ? D
        : never
      : never>;
    scenarioCvr: TileResult<Awaited<ReturnType<typeof queryCheckoutScenarioFunnel>> extends infer R
      ? R extends { ok: true; data: infer D }
        ? D
        : never
      : never>;
    utmAttribution: TileResult<Awaited<ReturnType<typeof queryEventTrendWeekly>> extends infer R
      ? R extends { ok: true; data: infer D }
        ? D
        : never
      : never>;
  };
  reconciliation: {
    days7: TileResult<{ neon: number; posthog: number; delta: number }>;
    days30: TileResult<{ neon: number; posthog: number; delta: number }>;
  };
};

async function wrapNeon<T>(fn: () => Promise<T>): Promise<TileResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function reconcileDays(
  days: number,
  appEnv: DashboardAppEnvFilter,
): Promise<TileResult<{ neon: number; posthog: number; delta: number }>> {
  const neonResult = await wrapNeon(() => countNeonPaidInLastDays(days));
  if (!neonResult.ok) return neonResult;

  const ph = await countAltaFulfilledInRange({ days, appEnv });
  if (!ph.ok) return ph;

  const neon = neonResult.data;
  const posthog = ph.data.count;
  return { ok: true, data: { neon, posthog, delta: neon - posthog } };
}

async function buildCvrLeadPaidTile(
  rangeDays: number,
  appEnv: DashboardAppEnvFilter,
): Promise<TileResult<CvrLeadPaidData>> {
  const [neonResult, phLeads] = await Promise.all([
    wrapNeon(() => getLeadToPaidCvr14d(rangeDays)),
    countAltaLeadSavedInRange({ days: rangeDays, appEnv }),
  ]);

  if (!neonResult.ok) return neonResult;

  return {
    ok: true,
    data: {
      ...neonResult.data,
      posthogLeads: phLeads.ok ? phLeads.data.count : null,
      posthogLeadsError: phLeads.ok ? undefined : phLeads.error,
    },
  };
}

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .validator((input: unknown) => DashboardInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<AnalyticsDashboardPayload> => {
    const { rangeDays, appEnv } = data;

    const weeklyResult = await wrapNeon(getWeeklyPaidMetrics);
    const weekly = weeklyResult.ok ? weeklyResult.data : null;

    const [
      funnelServer,
      funnelWizard,
      gmbErrors,
      scenarioCvr,
      utmAttribution,
      reconciliation7,
      reconciliation30,
      cvrLeadPaid,
    ] = await Promise.all([
      queryFunnel({
        steps: ["alta_lead_saved", "checkout_session_created", "alta_fulfilled"],
        windowValue: 48,
        windowUnit: "hour",
        rangeDays,
        appEnv,
      }),
      queryFunnel({
        steps: [
          "wizard_started",
          "wizard_place_confirmed",
          "wizard_domain_type_chosen",
          "wizard_brecha_viewed",
          "wizard_contact_submitted",
          "wizard_checkout_started",
        ],
        windowValue: 24,
        windowUnit: "hour",
        rangeDays,
        appEnv,
      }),
      queryEventTrendWeekly({
        event: "wizard_restaurant_search_error",
        rangeDays,
        appEnv,
        breakdownKey: "error",
      }),
      queryCheckoutScenarioFunnel({ rangeDays, appEnv }),
      queryEventTrendWeekly({
        event: "wizard_started",
        rangeDays,
        appEnv,
        breakdownKey: "utm_source",
      }),
      reconcileDays(7, appEnv),
      reconcileDays(30, appEnv),
      buildCvrLeadPaidTile(rangeDays, appEnv),
    ]);

    return {
      meta: {
        rangeDays,
        appEnv,
        replayUrl: getInternalAnalyticsReplayUrl() ?? null,
        checkoutScenarioSince: getCheckoutScenarioInstrumentedSince(),
        panelSlug: getInternalAnalyticsPanelSlug(),
      },
      row1: {
        weeklyRevenue: weekly
          ? { ok: true, data: weekly.revenue }
          : weeklyResult.ok
            ? { ok: false, error: "Sin datos" }
            : weeklyResult,
        weeklyTrials: weekly
          ? { ok: true, data: weekly.trials }
          : weeklyResult.ok
            ? { ok: false, error: "Sin datos" }
            : weeklyResult,
        cvrLeadPaid,
      },
      row2: {
        funnelServer,
        funnelWizard,
      },
      row3: {
        gmbErrors: gmbErrors.ok ? { ok: true, data: gmbErrors.data } : gmbErrors,
        scenarioCvr: scenarioCvr.ok ? { ok: true, data: scenarioCvr.data } : scenarioCvr,
        utmAttribution: utmAttribution.ok
          ? { ok: true, data: utmAttribution.data }
          : utmAttribution,
      },
      reconciliation: {
        days7: reconciliation7,
        days30: reconciliation30,
      },
    };
  });

export function isValidPanelSlug(slug: string): boolean {
  const expected =
    typeof process !== "undefined" && process.env.INTERNAL_ANALYTICS_PANEL_SLUG
      ? process.env.INTERNAL_ANALYTICS_PANEL_SLUG
      : DEFAULT_ANALYTICS_PANEL_SLUG;
  return slug === expected;
}
