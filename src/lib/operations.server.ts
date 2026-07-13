import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import type { DashboardAppEnvFilter } from "./analytics-posthog.server";
import { withNeonAppEnv } from "./neon-env-filter.server";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

export type OpsColumnId =
  | "contact_left"
  | "payment_abandoned"
  | "domain_pending"
  | "configuring"
  | "delivered";

export type OpsAltaCard = {
  id: string;
  restaurantName: string;
  contactName: string;
  whatsapp: string;
  whatsappHref: string;
  domain: string | null;
  domainLabel: string;
  amountEur: number | null;
  daysInColumn: number;
  staleWarning: boolean;
  opsNotes: string | null;
  columnSince: string;
  createdAt: string;
  paidAt: string | null;
};

export type OpsBoardColumn = {
  id: OpsColumnId;
  title: string;
  description: string;
  accent?: "amber";
  cards: OpsAltaCard[];
  total: number;
};

export type OpsBoardData = {
  columns: OpsBoardColumn[];
  rangeDays: number;
};

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_DAY));
}

function normalizeWhatsAppHref(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return "#";
  const withCountry = digits.startsWith("34") ? digits : `34${digits}`;
  return `https://wa.me/${withCountry}`;
}

function deriveColumn(row: typeof altas.$inferSelect, now: Date): OpsColumnId | null {
  if (row.deliveredAt) {
    return "delivered";
  }

  if (row.status === "paid") {
    if (row.domainIsCustom && !row.domainRegisteredAt) {
      return "domain_pending";
    }
    return "configuring";
  }

  if (row.status === "pending_payment") {
    const ageDays = daysBetween(row.createdAt, now);
    const checkoutAgeHours = row.checkoutStartedAt
      ? (now.getTime() - row.checkoutStartedAt.getTime()) / MS_HOUR
      : null;

    const abandoned =
      ageDays > 14 || (checkoutAgeHours != null && checkoutAgeHours > 48);

    if (abandoned) {
      return "payment_abandoned";
    }

    if (ageDays < 14) {
      return "contact_left";
    }
  }

  return null;
}

function columnSinceDate(row: typeof altas.$inferSelect, column: OpsColumnId): Date {
  switch (column) {
    case "delivered":
      return row.deliveredAt ?? row.createdAt;
    case "configuring":
      return row.domainRegisteredAt ?? row.paidAt ?? row.createdAt;
    case "domain_pending":
      return row.paidAt ?? row.createdAt;
    case "payment_abandoned":
      return row.checkoutStartedAt ?? row.createdAt;
    case "contact_left":
    default:
      return row.createdAt;
  }
}

function toCard(row: typeof altas.$inferSelect, column: OpsColumnId, now: Date): OpsAltaCard {
  const since = columnSinceDate(row, column);
  const daysInColumn = daysBetween(since, now);
  const amount =
    row.onetimeFeeAmount != null && Number(row.onetimeFeeAmount) > 0
      ? Number(row.onetimeFeeAmount)
      : null;

  return {
    id: row.id,
    restaurantName: row.restaurantName,
    contactName: row.contactName,
    whatsapp: row.whatsapp,
    whatsappHref: normalizeWhatsAppHref(row.whatsapp),
    domain: row.domain,
    domainLabel: row.domainIsCustom ? (row.domain ?? "dominio custom") : "subdominio",
    amountEur: amount,
    daysInColumn,
    staleWarning: column === "domain_pending" && daysInColumn > 3,
    opsNotes: row.opsNotes,
    columnSince: since.toISOString(),
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

const COLUMN_DEFS: Array<{
  id: OpsColumnId;
  title: string;
  description: string;
  accent?: "amber";
}> = [
  {
    id: "contact_left",
    title: "Contacto dejado",
    description: "Sin checkout o en curso · <14 días",
  },
  {
    id: "payment_abandoned",
    title: "Abandonó en el pago",
    description: ">48 h en checkout o >14 días",
    accent: "amber",
  },
  {
    id: "domain_pending",
    title: "Pagado — dominio por registrar",
    description: "Dominio custom pendiente de alta",
  },
  {
    id: "configuring",
    title: "Configurando",
    description: "Pagado · montaje en curso",
  },
  {
    id: "delivered",
    title: "Entregada",
    description: "Página publicada",
  },
];

export async function getOperationsBoard(
  rangeDays: number,
  appEnv: DashboardAppEnvFilter,
  envColumnReady: boolean,
): Promise<OpsBoardData> {
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * MS_DAY);

  const where = withNeonAppEnv(appEnv, envColumnReady, gte(altas.createdAt, since));
  const rows = await getDb().select().from(altas).where(where).orderBy(desc(altas.createdAt));

  const filtered = rows.filter((row) => row.createdAt >= since);

  const buckets = new Map<OpsColumnId, OpsAltaCard[]>();
  for (const def of COLUMN_DEFS) {
    buckets.set(def.id, []);
  }

  for (const row of filtered) {
    const column = deriveColumn(row, now);
    if (!column) continue;
    buckets.get(column)?.push(toCard(row, column, now));
  }

  const sortByRecent = (a: OpsAltaCard, b: OpsAltaCard) =>
    new Date(b.columnSince).getTime() - new Date(a.columnSince).getTime();

  const columns: OpsBoardColumn[] = COLUMN_DEFS.map((def) => {
    const all = (buckets.get(def.id) ?? []).sort(sortByRecent);
    return {
      ...def,
      cards: all,
      total: all.length,
    };
  });

  return { columns, rangeDays };
}

export type OpsCsvRow = {
  fecha: string;
  restaurante: string;
  contacto: string;
  telefono: string;
  email: string;
  tipoDominio: string;
  dominio: string;
  importe: string;
  estado: string;
  dominioRegistrado: string;
  entregada: string;
};

export async function getOperationsCsvRows(
  rangeDays: number,
  appEnv: DashboardAppEnvFilter,
  envColumnReady: boolean,
): Promise<OpsCsvRow[]> {
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * MS_DAY);

  const where = withNeonAppEnv(appEnv, envColumnReady, gte(altas.createdAt, since));
  const rows = await getDb().select().from(altas).where(where).orderBy(desc(altas.createdAt));

  const COLUMN_LABELS: Record<OpsColumnId, string> = {
    contact_left: "Contacto dejado",
    payment_abandoned: "Abandonó en el pago",
    domain_pending: "Pagado — dominio por registrar",
    configuring: "Configurando",
    delivered: "Entregada",
  };

  return rows
    .filter((row) => row.createdAt >= since)
    .map((row) => {
      const column = deriveColumn(row, now);
      const amount =
        row.onetimeFeeAmount != null ? Number(row.onetimeFeeAmount).toFixed(2) : "0";

      return {
        fecha: row.createdAt.toISOString().slice(0, 10),
        restaurante: row.restaurantName,
        contacto: row.contactName,
        telefono: row.whatsapp,
        email: row.customerEmail ?? "",
        tipoDominio: row.domainIsCustom ? "custom" : "subdominio",
        dominio: row.domain ?? "",
        importe: amount,
        estado: column ? COLUMN_LABELS[column] : "—",
        dominioRegistrado: row.domainRegisteredAt?.toISOString().slice(0, 10) ?? "",
        entregada: row.deliveredAt?.toISOString().slice(0, 10) ?? "",
      };
    });
}

export async function updateOpsNotes(altaId: string, notes: string | null) {
  await getDb().update(altas).set({ opsNotes: notes }).where(eq(altas.id, altaId));
}

export async function markDomainRegistered(altaId: string) {
  const now = new Date();
  await getDb()
    .update(altas)
    .set({ domainRegisteredAt: now, opsStatus: "domain_registered" })
    .where(eq(altas.id, altaId));
}

export async function markDelivered(altaId: string) {
  const now = new Date();
  await getDb()
    .update(altas)
    .set({ deliveredAt: now, opsStatus: "delivered" })
    .where(eq(altas.id, altaId));
}

/** Primer click en WhatsApp desde el panel; idempotente (COALESCE). */
export async function markWaOpened(altaId: string) {
  await getDb()
    .update(altas)
    .set({
      waOpenedAt: sql`COALESCE(${altas.waOpenedAt}, NOW())`,
    })
    .where(eq(altas.id, altaId));
}
