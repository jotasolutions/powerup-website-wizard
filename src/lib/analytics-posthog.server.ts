import {
  getPostHogApiHost,
  getPostHogPersonalApiKey,
  getPostHogProjectId,
  hasPostHogQueryConfig,
} from "./env.server";
import { NARRATIVE_FUNNEL_STEPS } from "./analytics-narrative";

export type PostHogQueryResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type HogQLResponse = {
  results?: unknown[][];
  columns?: string[];
  error?: string;
};

type FunnelsResponse = {
  results?: Array<{
    count: number;
    name: string;
    order: number;
  }>;
  error?: string;
};

type TrendsResponse = {
  results?: Array<{
    data: number[];
    labels: string[];
    label?: string;
    breakdown_value?: string | number | null;
  }>;
  error?: string;
};

export type DashboardAppEnvFilter = "production" | "all";

function appEnvHogQLClause(filter: DashboardAppEnvFilter): string {
  if (filter === "all") return "";
  return ` AND properties.app_env = 'production'`;
}

export async function executeHogQLQuery(
  query: string,
): Promise<PostHogQueryResult<HogQLResponse>> {
  if (!hasPostHogQueryConfig()) {
    return { ok: false, error: "POSTHOG_PERSONAL_API_KEY no configurada" };
  }

  const apiKey = getPostHogPersonalApiKey()!;
  const host = getPostHogApiHost().replace(/\/$/, "");
  const projectId = getPostHogProjectId();

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `PostHog HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { results?: HogQLResponse; error?: string };
    if (json.error) {
      return { ok: false, error: json.error };
    }
    return { ok: true, data: json as HogQLResponse };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executePostHogQuery<T>(
  query: Record<string, unknown>,
): Promise<PostHogQueryResult<T>> {
  if (!hasPostHogQueryConfig()) {
    return { ok: false, error: "POSTHOG_PERSONAL_API_KEY no configurada" };
  }

  const apiKey = getPostHogPersonalApiKey()!;
  const host = getPostHogApiHost().replace(/\/$/, "");
  const projectId = getPostHogProjectId();

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `PostHog HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { results?: T; error?: string };
    if (json.error) {
      return { ok: false, error: json.error };
    }
    return { ok: true, data: json as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function dateRangeFromDays(days: number): { date_from: string; date_to: string | null } {
  return {
    date_from: `-${days}d`,
    date_to: null,
  };
}

function appEnvProperties(filter: DashboardAppEnvFilter) {
  if (filter === "all") return undefined;
  return [
    {
      key: "app_env",
      value: "production",
      operator: "exact",
      type: "event",
    },
  ];
}

export async function queryFunnel(params: {
  steps: string[];
  windowValue: number;
  windowUnit: "hour" | "day";
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ steps: Array<{ event: string; count: number }> }>> {
  const result = await executePostHogQuery<FunnelsResponse>({
    kind: "FunnelsQuery",
    series: params.steps.map((event) => ({
      kind: "EventsNode",
      event,
      name: event,
    })),
    dateRange: dateRangeFromDays(params.rangeDays),
    funnelsFilter: {
      funnelWindowInterval: params.windowValue,
      funnelWindowIntervalUnit: params.windowUnit,
    },
    properties: appEnvProperties(params.appEnv),
  });

  if (!result.ok) return result;

  const steps =
    result.data.results?.map((row, index) => ({
      event: params.steps[index] ?? row.name,
      count: row.count,
    })) ?? [];

  return { ok: true, data: { steps } };
}

export async function queryEventTrendWeekly(params: {
  event: string;
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
  breakdownKey?: string;
}): Promise<
  PostHogQueryResult<{
    series: Array<{ label: string; points: Array<{ week: string; count: number }> }>;
  }>
> {
  const breakdown = params.breakdownKey
    ? `, properties.${params.breakdownKey}`
  : "";
  const groupBy = params.breakdownKey
    ? `, properties.${params.breakdownKey}`
    : "";

  const hogql = `
    SELECT
      toStartOfWeek(timestamp) AS week
      ${breakdown},
      count() AS cnt
    FROM events
    WHERE event = '${params.event}'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY week${groupBy}
    ORDER BY week
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const weekIdx = columns.indexOf("week");
  const breakdownIdx = params.breakdownKey ? columns.indexOf(`properties.${params.breakdownKey}`) : -1;
  const countIdx = columns.findIndex((c) => c === "cnt" || c === "count()");

  const bySeries = new Map<string, Array<{ week: string; count: number }>>();

  for (const row of result.data.results ?? []) {
    const week = String(row[weekIdx] ?? "");
    const count = Number(row[countIdx] ?? 0);
    const label =
      breakdownIdx >= 0 ? String(row[breakdownIdx] ?? "(sin valor)") : params.event;
    const points = bySeries.get(label) ?? [];
    points.push({ week, count });
    bySeries.set(label, points);
  }

  return {
    ok: true,
    data: {
      series: [...bySeries.entries()].map(([label, points]) => ({ label, points })),
    },
  };
}

export async function countAltaFulfilledInRange(params: {
  days: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ count: number }>> {
  return countPostHogEventsInRange({ event: "alta_fulfilled", ...params });
}

export async function countAltaLeadSavedInRange(params: {
  days: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ count: number }>> {
  return countPostHogEventsInRange({ event: "alta_lead_saved", ...params });
}

async function countPostHogEventsInRange(params: {
  event: string;
  days: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ count: number }>> {
  const hogql = `
    SELECT count() AS cnt
    FROM events
    WHERE event = '${params.event}'
      AND timestamp >= now() - INTERVAL ${params.days} DAY
      ${appEnvHogQLClause(params.appEnv)}
  `;
  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;
  const row = result.data.results?.[0];
  const count = Number(row?.[0] ?? 0);
  return { ok: true, data: { count } };
}

export async function queryCheckoutScenarioFunnel(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<
  PostHogQueryResult<{
    scenarios: Array<{ scenario: string; started: number; fulfilled: number; rate: number }>;
  }>
> {
  const hogql = `
    SELECT
      properties.checkout_scenario AS scenario,
      countIf(event = 'checkout_session_created') AS started,
      countIf(event = 'alta_fulfilled') AS fulfilled
    FROM events
    WHERE event IN ('checkout_session_created', 'alta_fulfilled')
      AND properties.checkout_scenario IS NOT NULL
      AND properties.checkout_scenario != 'management_fee'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY scenario
    ORDER BY started DESC
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const scenarioIdx = columns.indexOf("scenario");
  const startedIdx = columns.findIndex((c) => c.startsWith("started") || c.includes("checkout"));
  const fulfilledIdx = columns.findIndex((c) => c.includes("fulfilled"));

  const scenarios =
    result.data.results?.map((row) => {
      const started = Number(row[startedIdx] ?? 0);
      const fulfilled = Number(row[fulfilledIdx] ?? 0);
      return {
        scenario: String(row[scenarioIdx] ?? "unknown"),
        started,
        fulfilled,
        rate: started > 0 ? fulfilled / started : 0,
      };
    }) ?? [];

  return { ok: true, data: { scenarios } };
}

export async function queryNarrativeFunnel(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ steps: Array<{ event: string; count: number }> }>> {
  const events = NARRATIVE_FUNNEL_STEPS.map((s) => s.event);
  return queryFunnel({
    steps: [...events],
    windowValue: 48,
    windowUnit: "hour",
    rangeDays: params.rangeDays,
    appEnv: params.appEnv,
  });
}

export async function queryPlaceOriginBreakdown(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ google: number; manual: number }>> {
  const hogql = `
    SELECT
      if(
        notEmpty(toString(properties.place_origin)),
        toString(properties.place_origin),
        if(properties.gmb_place_id IS NOT NULL, 'google', 'manual')
      ) AS origin,
      count() AS cnt
    FROM events
    WHERE event = 'wizard_place_confirmed'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY origin
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const originIdx = columns.findIndex((c) => c === "origin");
  const countIdx = columns.findIndex((c) => c === "cnt" || c === "count()");

  let google = 0;
  let manual = 0;
  for (const row of result.data.results ?? []) {
    const origin = String(row[originIdx] ?? "");
    const cnt = Number(row[countIdx] ?? 0);
    if (origin === "google") google = cnt;
    else if (origin === "manual") manual = cnt;
  }

  return { ok: true, data: { google, manual } };
}

export async function queryFulfilledDomainBreakdown(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ domainPaid: number; subdomainFree: number }>> {
  const hogql = `
    SELECT
      if(
        toFloat(properties.onetime_fee_amount) > 0
        OR properties.checkout_scenario = 'custom_domain',
        'domain_paid',
        'subdomain_free'
      ) AS kind,
      count() AS cnt
    FROM events
    WHERE event = 'alta_fulfilled'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY kind
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const kindIdx = columns.findIndex((c) => c === "kind");
  const countIdx = columns.findIndex((c) => c === "cnt" || c === "count()");

  let domainPaid = 0;
  let subdomainFree = 0;
  for (const row of result.data.results ?? []) {
    const kind = String(row[kindIdx] ?? "");
    const cnt = Number(row[countIdx] ?? 0);
    if (kind === "domain_paid") domainPaid = cnt;
    else if (kind === "subdomain_free") subdomainFree = cnt;
  }

  return { ok: true, data: { domainPaid, subdomainFree } };
}

export async function countGmbErrorsInDays(params: {
  days: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ total: number; topError: string | null }>> {
  const hogql = `
    SELECT
      coalesce(toString(properties.error), '(sin tipo)') AS error_type,
      count() AS cnt
    FROM events
    WHERE event = 'wizard_restaurant_search_error'
      AND timestamp >= now() - INTERVAL ${params.days} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY error_type
    ORDER BY cnt DESC
    LIMIT 5
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const errorIdx = columns.findIndex((c) => c.includes("error"));
  const countIdx = columns.findIndex((c) => c === "cnt" || c === "count()");

  let total = 0;
  let topError: string | null = null;
  for (const [i, row] of (result.data.results ?? []).entries()) {
    const cnt = Number(row[countIdx] ?? 0);
    total += cnt;
    if (i === 0) topError = String(row[errorIdx] ?? null);
  }

  return { ok: true, data: { total, topError } };
}

export async function queryUtmChannelActivation(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<
  PostHogQueryResult<{
    channels: Array<{ utm: string; starts: number; activations: number }>;
  }>
> {
  const hogql = `
    WITH session_starts AS (
      SELECT
        person_id,
        argMin(coalesce(nullIf(toString(properties.utm_source), ''), '(directo)'), timestamp) AS utm
      FROM events
      WHERE event = 'wizard_started'
        AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
        ${appEnvHogQLClause(params.appEnv)}
      GROUP BY person_id
    ),
    activations AS (
      SELECT person_id
      FROM events
      WHERE event = 'alta_fulfilled'
        AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
        ${appEnvHogQLClause(params.appEnv)}
      GROUP BY person_id
    ),
    starts_by_utm AS (
      SELECT utm, count() AS starts
      FROM session_starts
      GROUP BY utm
    ),
    activations_by_utm AS (
      SELECT s.utm, count() AS activations
      FROM session_starts s
      INNER JOIN activations a ON s.person_id = a.person_id
      GROUP BY s.utm
    )
    SELECT
      sb.utm,
      sb.starts,
      coalesce(ab.activations, 0) AS activations
    FROM starts_by_utm sb
    LEFT JOIN activations_by_utm ab ON sb.utm = ab.utm
    ORDER BY sb.starts DESC
    LIMIT 10
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const utmIdx = columns.findIndex((c) => c === "utm");
  const startsIdx = columns.findIndex((c) => c === "starts");
  const activationsIdx = columns.findIndex((c) => c === "activations");

  const channels =
    result.data.results?.map((row) => ({
      utm: String(row[utmIdx] ?? "(directo)"),
      starts: Number(row[startsIdx] ?? 0),
      activations: Number(row[activationsIdx] ?? 0),
    })) ?? [];

  return { ok: true, data: { channels } };
}

export async function queryDomainTypeChosenBreakdown(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<PostHogQueryResult<{ paid: number; free: number }>> {
  const hogql = `
    SELECT
      if(
        toString(properties.domain_type) = 'custom_domain',
        'paid',
        'free'
      ) AS kind,
      count() AS cnt
    FROM events
    WHERE event = 'wizard_domain_type_chosen'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY kind
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const kindIdx = columns.findIndex((c) => c === "kind");
  const countIdx = columns.findIndex((c) => c === "cnt" || c === "count()");

  let paid = 0;
  let free = 0;
  for (const row of result.data.results ?? []) {
    const kind = String(row[kindIdx] ?? "");
    const cnt = Number(row[countIdx] ?? 0);
    if (kind === "paid") paid = cnt;
    else if (kind === "free") free = cnt;
  }

  return { ok: true, data: { paid, free } };
}

export async function queryDomainTypeActivationFunnel(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<
  PostHogQueryResult<{
    paid: { chosen: number; activated: number };
    free: { chosen: number; activated: number };
  }>
> {
  const hogql = `
    WITH choices AS (
      SELECT
        person_id,
        argMin(
          if(toString(properties.domain_type) = 'custom_domain', 'paid', 'free'),
          timestamp
        ) AS kind,
        min(timestamp) AS chosen_at
      FROM events
      WHERE event = 'wizard_domain_type_chosen'
        AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
        ${appEnvHogQLClause(params.appEnv)}
      GROUP BY person_id
    ),
    fulfilled AS (
      SELECT person_id, min(timestamp) AS fulfilled_at
      FROM events
      WHERE event = 'alta_fulfilled'
        AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
        ${appEnvHogQLClause(params.appEnv)}
      GROUP BY person_id
    )
    SELECT
      c.kind,
      count() AS chosen,
      countIf(
        f.fulfilled_at IS NOT NULL
        AND f.fulfilled_at >= c.chosen_at
        AND f.fulfilled_at <= c.chosen_at + INTERVAL 48 HOUR
      ) AS activated
    FROM choices c
    LEFT JOIN fulfilled f ON c.person_id = f.person_id
    GROUP BY c.kind
  `;

  const result = await executeHogQLQuery(hogql);
  if (!result.ok) return result;

  const columns = result.data.columns ?? [];
  const kindIdx = columns.findIndex((c) => c === "kind");
  const chosenIdx = columns.findIndex((c) => c === "chosen");
  const activatedIdx = columns.findIndex((c) => c === "activated");

  const empty = { chosen: 0, activated: 0 };
  let paid = { ...empty };
  let free = { ...empty };

  for (const row of result.data.results ?? []) {
    const kind = String(row[kindIdx] ?? "");
    const bucket = {
      chosen: Number(row[chosenIdx] ?? 0),
      activated: Number(row[activatedIdx] ?? 0),
    };
    if (kind === "paid") paid = bucket;
    else if (kind === "free") free = bucket;
  }

  return { ok: true, data: { paid, free } };
}

const MADRID_TZ = "Europe/Madrid";

export async function queryWizardStartedTiming(params: {
  rangeDays: number;
  appEnv: DashboardAppEnvFilter;
}): Promise<
  PostHogQueryResult<{
    total: number;
    byDayOfWeek: Array<{ day: number; label: string; count: number }>;
    byTimeSlot: Array<{ slot: string; label: string; count: number }>;
  }>
> {
  const dowHogql = `
    SELECT
      toDayOfWeek(toTimeZone(timestamp, '${MADRID_TZ}')) AS dow,
      count() AS cnt
    FROM events
    WHERE event = 'wizard_started'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY dow
    ORDER BY dow
  `;

  const slotHogql = `
    SELECT
      multiIf(
        toHour(toTimeZone(timestamp, '${MADRID_TZ}')) >= 6
          AND toHour(toTimeZone(timestamp, '${MADRID_TZ}')) < 14,
        'morning',
        toHour(toTimeZone(timestamp, '${MADRID_TZ}')) >= 14
          AND toHour(toTimeZone(timestamp, '${MADRID_TZ}')) < 22,
        'afternoon',
        'night'
      ) AS slot,
      count() AS cnt
    FROM events
    WHERE event = 'wizard_started'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
    GROUP BY slot
    ORDER BY slot
  `;

  const totalHogql = `
    SELECT count() AS cnt
    FROM events
    WHERE event = 'wizard_started'
      AND timestamp >= now() - INTERVAL ${params.rangeDays} DAY
      ${appEnvHogQLClause(params.appEnv)}
  `;

  const [dowResult, slotResult, totalResult] = await Promise.all([
    executeHogQLQuery(dowHogql),
    executeHogQLQuery(slotHogql),
    executeHogQLQuery(totalHogql),
  ]);

  if (!dowResult.ok) return dowResult;
  if (!slotResult.ok) return slotResult;
  if (!totalResult.ok) return totalResult;

  const DOW_LABELS: Record<number, string> = {
    1: "L",
    2: "M",
    3: "X",
    4: "J",
    5: "V",
    6: "S",
    7: "D",
  };

  const SLOT_LABELS: Record<string, string> = {
    morning: "Mañana 6–14",
    afternoon: "Tarde 14–22",
    night: "Noche 22–6",
  };

  const dowColumns = dowResult.data.columns ?? [];
  const dowIdx = dowColumns.findIndex((c) => c === "dow");
  const dowCountIdx = dowColumns.findIndex((c) => c === "cnt" || c === "count()");

  const byDayOfWeek = (dowResult.data.results ?? []).map((row) => {
    const day = Number(row[dowIdx] ?? 0);
    return {
      day,
      label: DOW_LABELS[day] ?? String(day),
      count: Number(row[dowCountIdx] ?? 0),
    };
  });

  const slotColumns = slotResult.data.columns ?? [];
  const slotIdx = slotColumns.findIndex((c) => c === "slot");
  const slotCountIdx = slotColumns.findIndex((c) => c === "cnt" || c === "count()");

  const byTimeSlot = (slotResult.data.results ?? []).map((row) => {
    const slot = String(row[slotIdx] ?? "");
    return {
      slot,
      label: SLOT_LABELS[slot] ?? slot,
      count: Number(row[slotCountIdx] ?? 0),
    };
  });

  const total = Number(totalResult.data.results?.[0]?.[0] ?? 0);

  return { ok: true, data: { total, byDayOfWeek, byTimeSlot } };
}
