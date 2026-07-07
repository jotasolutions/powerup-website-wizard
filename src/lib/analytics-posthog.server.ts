import {
  getPostHogApiHost,
  getPostHogPersonalApiKey,
  getPostHogProjectId,
  hasPostHogQueryConfig,
} from "./env.server";

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
    return { ok: true, data: (json.results ?? json) as HogQLResponse };
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
    return { ok: true, data: (json.results ?? json) as T };
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
  const hogql = `
    SELECT count() AS cnt
    FROM events
    WHERE event = 'alta_fulfilled'
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
