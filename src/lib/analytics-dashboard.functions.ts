import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  computeWorstDropoff,
  LOW_SAMPLE_THRESHOLD,
  normalizeFunnelSteps,
  type SectionLight,
  type WorstDropoff,
} from "./analytics-narrative";
import {
  countAltaFulfilledInRange,
  countAltaLeadSavedInRange,
  countGmbErrorsInDays,
  queryCheckoutScenarioFunnel,
  queryEventTrendWeekly,
  queryFulfilledDomainBreakdown,
  queryFunnel,
  queryNarrativeFunnel,
  queryPlaceOriginBreakdown,
  queryUtmChannelActivation,
  type DashboardAppEnvFilter,
} from "./analytics-posthog.server";
import {
  getDay30SubscriptionTile,
  type Day30SubscriptionTile,
} from "./analytics-day30.server";
import {
  countNeonPaidInLastDays,
  getLeadToPaidCvr14d,
  getWeeklyPaidMetrics,
  getWeeklyRevenueSumEur,
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

export type NarrativeFunnelData = {
  steps: ReturnType<typeof normalizeFunnelSteps>;
  worstDropoff: WorstDropoff | null;
  placeOrigin: { google: number; manual: number };
  fulfilledBreakdown: { domainPaid: number; subdomainFree: number };
  reconciliation: { neon: number; posthog: number; delta: number };
  topCount: number;
};

export type SummaryData = {
  sentence: string;
  sufficient: boolean;
};

export type SectionLights = {
  funciona: { light: SectionLight; subtitle: string };
  donde: { light: SectionLight; subtitle: string };
  porque: { light: SectionLight; subtitle: string };
};

export type DomainPaymentsData = {
  count: { current: number; previous: number };
  sumEur: { current: number; previous: number };
};

export type WhySearchData = {
  totalErrors: number;
  topError: string | null;
  rangeDays: number;
};

export type WhyDomainData = {
  scenarios: Array<{ scenario: string; started: number; fulfilled: number; rate: number }>;
  customDomainRate: number | null;
  trialFreeRate: number | null;
  ratio: number | null;
  sampleN: number;
};

export type WhyChannelsData = {
  channels: Array<{ utm: string; starts: number; activations: number }>;
};

export type AnalyticsDashboardPayload = {
  meta: {
    rangeDays: number;
    appEnv: DashboardAppEnvFilter;
    replayUrl: string | null;
    checkoutScenarioSince: string;
    panelSlug: string;
  };
  summary: TileResult<SummaryData>;
  sectionLights: SectionLights;
  row1: {
    domainPayments: TileResult<DomainPaymentsData>;
    subdomainSignups: TileResult<{ current: number; previous: number }>;
    contactToSignup: TileResult<CvrLeadPaidData>;
    day30: TileResult<Day30SubscriptionTile>;
  };
  narrativeFunnel: TileResult<NarrativeFunnelData>;
  why: {
    search: TileResult<WhySearchData>;
    domainVsFree: TileResult<WhyDomainData>;
    channels: TileResult<WhyChannelsData>;
  };
  technical: {
    funnelServer: TileResult<{ steps: Array<{ event: string; count: number }> }>;
    funnelWizard: TileResult<{ steps: Array<{ event: string; count: number }> }>;
    gmbErrors: TileResult<
      Awaited<ReturnType<typeof queryEventTrendWeekly>> extends infer R
        ? R extends { ok: true; data: infer D }
          ? D
          : never
        : never
    >;
    scenarioCvr: TileResult<
      Awaited<ReturnType<typeof queryCheckoutScenarioFunnel>> extends infer R
        ? R extends { ok: true; data: infer D }
          ? D
          : never
        : never
    >;
    utmAttribution: TileResult<
      Awaited<ReturnType<typeof queryEventTrendWeekly>> extends infer R
        ? R extends { ok: true; data: infer D }
          ? D
          : never
        : never
    >;
    reconciliation: {
      days7: TileResult<{ neon: number; posthog: number; delta: number }>;
      days30: TileResult<{ neon: number; posthog: number; delta: number }>;
    };
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

function buildWhyDomainData(
  scenarios: Array<{ scenario: string; started: number; fulfilled: number; rate: number }>,
): WhyDomainData {
  const custom = scenarios.find((s) => s.scenario === "custom_domain");
  const trial = scenarios.find((s) => s.scenario === "trial_free");
  const customRate = custom && custom.started > 0 ? custom.fulfilled / custom.started : null;
  const trialRate = trial && trial.started > 0 ? trial.fulfilled / trial.started : null;
  const sampleN = Math.max(custom?.started ?? 0, trial?.started ?? 0);
  let ratio: number | null = null;
  if (customRate != null && trialRate != null && trialRate > 0) {
    ratio = customRate / trialRate;
  }

  return {
    scenarios,
    customDomainRate: customRate,
    trialFreeRate: trialRate,
    ratio,
    sampleN,
  };
}

function buildSummary(params: {
  weeklyDomain: number;
  weeklyTrials: number;
  worstDropoff: WorstDropoff | null;
  topCount: number;
}): SummaryData {
  const weeklyTotal = params.weeklyDomain + params.weeklyTrials;
  if (weeklyTotal < 1 || params.topCount < LOW_SAMPLE_THRESHOLD || !params.worstDropoff) {
    return {
      sufficient: false,
      sentence: "Sin actividad suficiente esta semana para un resumen.",
    };
  }

  return {
    sufficient: true,
    sentence: `Esta semana: ${weeklyTotal} altas (${params.weeklyDomain} con dominio de pago, ${params.weeklyTrials} con subdominio gratis). El mayor punto de fuga es ${params.worstDropoff.stepLabel.toLowerCase()}, donde abandona el ${params.worstDropoff.dropPercent}% de quienes llegan.`,
  };
}

function buildSectionLights(params: {
  reconciliation7: TileResult<{ neon: number; posthog: number; delta: number }>;
  paidInRange: number;
  topCount: number;
  worstDropoff: WorstDropoff | null;
  gmbErrorsWeek: number;
  gmbErrorsOk: boolean;
}): SectionLights {
  const funcionaGreen =
    params.reconciliation7.ok &&
    params.reconciliation7.data.delta === 0 &&
    params.paidInRange >= 1;

  const dondeAmber =
    params.topCount >= LOW_SAMPLE_THRESHOLD &&
    params.worstDropoff != null &&
    params.worstDropoff.dropPercent > 25;

  const porqueGreen = params.gmbErrorsOk && params.gmbErrorsWeek === 0;
  const porqueAmber = params.gmbErrorsOk && params.gmbErrorsWeek > 0;

  return {
    funciona: {
      light: params.topCount < LOW_SAMPLE_THRESHOLD ? "gray" : funcionaGreen ? "green" : "gray",
      subtitle: funcionaGreen
        ? "Sí, hay altas y las fuentes cuadran"
        : params.topCount < LOW_SAMPLE_THRESHOLD
          ? "Sin datos suficientes"
          : "Revisar reconciliación o volumen",
    },
    donde: {
      light:
        params.topCount < LOW_SAMPLE_THRESHOLD ? "gray" : dondeAmber ? "amber" : "green",
      subtitle:
        params.topCount < LOW_SAMPLE_THRESHOLD
          ? "Sin datos suficientes"
          : dondeAmber
            ? "Un paso concentra la fuga"
            : "Fuga repartida o baja",
    },
    porque: {
      light: !params.gmbErrorsOk
        ? "gray"
        : porqueGreen
          ? "green"
          : porqueAmber
            ? "amber"
            : "gray",
      subtitle: !params.gmbErrorsOk
        ? "Sin datos suficientes"
        : porqueGreen
          ? "Sin errores técnicos de búsqueda"
          : porqueAmber
            ? "Hay errores de búsqueda Google"
            : "Sin datos suficientes",
    },
  };
}

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .validator((input: unknown) => DashboardInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<AnalyticsDashboardPayload> => {
    const { rangeDays, appEnv } = data;

    const weeklyResult = await wrapNeon(getWeeklyPaidMetrics);
    const weekly = weeklyResult.ok ? weeklyResult.data : null;
    const revenueSumResult = await wrapNeon(getWeeklyRevenueSumEur);
    const day30Result = await wrapNeon(() => getDay30SubscriptionTile());

    const [
      narrativeFunnelRaw,
      placeOrigin,
      fulfilledBreakdown,
      funnelServer,
      funnelWizard,
      gmbErrors,
      scenarioCvr,
      utmAttribution,
      reconciliation7,
      reconciliation30,
      cvrLeadPaid,
      gmbErrorsWeek,
      utmChannels,
      paidInRange,
    ] = await Promise.all([
      queryNarrativeFunnel({ rangeDays, appEnv }),
      queryPlaceOriginBreakdown({ rangeDays, appEnv }),
      queryFulfilledDomainBreakdown({ rangeDays, appEnv }),
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
      countGmbErrorsInDays({ days: 7, appEnv }),
      queryUtmChannelActivation({ rangeDays, appEnv }),
      wrapNeon(() => countNeonPaidInLastDays(rangeDays)),
    ]);

    const narrativeSteps =
      narrativeFunnelRaw.ok && placeOrigin.ok && fulfilledBreakdown.ok
        ? normalizeFunnelSteps(narrativeFunnelRaw.data.steps)
        : [];
    const worstDropoff = narrativeSteps.length > 0 ? computeWorstDropoff(narrativeSteps) : null;
    const topCount = narrativeSteps[0]?.count ?? 0;

    const reconciliationForFunnel =
      reconciliation30.ok
        ? reconciliation30.data
        : { neon: 0, posthog: 0, delta: 0 };

    const narrativeFunnel: TileResult<NarrativeFunnelData> =
      narrativeFunnelRaw.ok && placeOrigin.ok && fulfilledBreakdown.ok
        ? {
            ok: true,
            data: {
              steps: narrativeSteps,
              worstDropoff,
              placeOrigin: placeOrigin.data,
              fulfilledBreakdown: {
                domainPaid: fulfilledBreakdown.data.domainPaid,
                subdomainFree: fulfilledBreakdown.data.subdomainFree,
              },
              reconciliation: reconciliationForFunnel,
              topCount,
            },
          }
        : {
            ok: false,
            error:
              (!narrativeFunnelRaw.ok && narrativeFunnelRaw.error) ||
              (!placeOrigin.ok && placeOrigin.error) ||
              (!fulfilledBreakdown.ok && fulfilledBreakdown.error) ||
              "Sin datos de funnel",
          };

    const summary: TileResult<SummaryData> = weekly
      ? {
          ok: true,
          data: buildSummary({
            weeklyDomain: weekly.revenue.current,
            weeklyTrials: weekly.trials.current,
            worstDropoff,
            topCount,
          }),
        }
      : weeklyResult.ok
        ? { ok: false, error: "Sin datos semanales" }
        : weeklyResult;

    const sectionLights = buildSectionLights({
      reconciliation7,
      paidInRange: paidInRange.ok ? paidInRange.data : 0,
      topCount,
      worstDropoff,
      gmbErrorsWeek: gmbErrorsWeek.ok ? gmbErrorsWeek.data.total : 0,
      gmbErrorsOk: gmbErrorsWeek.ok,
    });

    const domainPayments: TileResult<DomainPaymentsData> =
      weekly && revenueSumResult.ok
        ? {
            ok: true,
            data: {
              count: weekly.revenue,
              sumEur: revenueSumResult.data,
            },
          }
        : !weeklyResult.ok
          ? weeklyResult
          : !revenueSumResult.ok
            ? revenueSumResult
            : { ok: false, error: "Sin datos" };

    return {
      meta: {
        rangeDays,
        appEnv,
        replayUrl: getInternalAnalyticsReplayUrl() ?? null,
        checkoutScenarioSince: getCheckoutScenarioInstrumentedSince(),
        panelSlug: getInternalAnalyticsPanelSlug(),
      },
      summary,
      sectionLights,
      row1: {
        domainPayments,
        subdomainSignups: weekly
          ? { ok: true, data: weekly.trials }
          : weeklyResult.ok
            ? { ok: false, error: "Sin datos" }
            : weeklyResult,
        contactToSignup: cvrLeadPaid,
        day30: day30Result,
      },
      narrativeFunnel,
      why: {
        search: gmbErrorsWeek.ok
          ? {
              ok: true,
              data: {
                totalErrors: gmbErrorsWeek.data.total,
                topError: gmbErrorsWeek.data.topError,
                rangeDays: 7,
              },
            }
          : gmbErrorsWeek,
        domainVsFree: scenarioCvr.ok
          ? { ok: true, data: buildWhyDomainData(scenarioCvr.data.scenarios) }
          : scenarioCvr,
        channels: utmChannels.ok
          ? { ok: true, data: { channels: utmChannels.data.channels } }
          : utmChannels,
      },
      technical: {
        funnelServer,
        funnelWizard,
        gmbErrors: gmbErrors.ok ? { ok: true, data: gmbErrors.data } : gmbErrors,
        scenarioCvr: scenarioCvr.ok ? { ok: true, data: scenarioCvr.data } : scenarioCvr,
        utmAttribution: utmAttribution.ok
          ? { ok: true, data: utmAttribution.data }
          : utmAttribution,
        reconciliation: {
          days7: reconciliation7,
          days30: reconciliation30,
        },
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
