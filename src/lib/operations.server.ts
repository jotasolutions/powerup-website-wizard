import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import type { DashboardAppEnvFilter } from "./analytics-posthog.server";
import { withNeonAppEnv } from "./neon-env-filter.server";
import {
  MS_DAY,
  OPS_DELIVERED_PREVIEW,
  OPS_DOMAIN_OVERDUE_DAYS,
  OPS_LEADS_ACTIVE_DAYS,
  OPS_RESULT_LINE_DAYS,
} from "./ops-config";
import {
  deriveDeliveryColumn,
  deriveHistoricDesenlace,
  deriveLeadEstado,
  deriveLeadGroup,
  isInLeadsActiveWindow,
  isPendingLead,
  type OpsHistoricDesenlace,
  type OpsLeadEstado,
  type OpsLeadGroupId,
} from "./ops-derive";

type AltaRow = typeof altas.$inferSelect;

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_DAY));
}

export function normalizeWhatsAppHref(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return "#";
  const withCountry = digits.startsWith("34") ? digits : `34${digits}`;
  return `https://wa.me/${withCountry}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatAgeLabel(from: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - from.getTime()) / (60 * 60 * 1000));
  if (hours < 24) {
    if (hours < 1) return "hace un momento";
    return hours === 1 ? "hace 1 h" : `hace ${hours} h`;
  }
  const days = daysBetween(from, now);
  if (days === 1) return "ayer";
  if (days < 14) return `${days} días`;
  return formatShortDate(from);
}

function domainLabel(row: AltaRow): string {
  if (row.domainIsCustom) {
    return row.domain ?? "dominio custom";
  }
  return "subdominio";
}

function amountEur(row: AltaRow): number | null {
  if (row.onetimeFeeAmount != null && Number(row.onetimeFeeAmount) > 0) {
    return Number(row.onetimeFeeAmount);
  }
  return null;
}

function domainChoiceLabel(row: AltaRow): string {
  const base = domainLabel(row);
  const amount = amountEur(row);
  if (amount != null) {
    return `${base} · ${amount.toLocaleString("es-ES")} €`;
  }
  return base;
}

export type OpsDeliveryCard = {
  id: string;
  restaurantName: string;
  contactName: string;
  whatsappHref: string;
  domainLabel: string;
  amountEur: number | null;
  daysInColumn: number;
  staleWarning: boolean;
  opsNotes: string | null;
  stampLabel: string;
  paidAt: string | null;
  deliveredAt: string | null;
  siteUrl: string | null;
  deliveryDays: number | null;
};

export type OpsLeadRow = {
  id: string;
  restaurantName: string;
  contactName: string;
  whatsappHref: string;
  createdAt: string;
  ageLabel: string;
  domainChoiceLabel: string;
  estado: OpsLeadEstado | null;
  opsNotes: string | null;
  group: OpsLeadGroupId;
};

export type OpsHistoricLeadRow = {
  id: string;
  restaurantName: string;
  contactName: string;
  whatsappHref: string;
  createdAt: string;
  ageLabel: string;
  domainChoiceLabel: string;
  desenlace: OpsHistoricDesenlace;
  opsNotes: string | null;
  showContactActions: boolean;
};

export type OpsBoardV3Data = {
  delivery: {
    domainPending: OpsDeliveryCard[];
    building: OpsDeliveryCard[];
    delivered: OpsDeliveryCard[];
    deliveredTotal: number;
    domainPendingOverdue: number;
    deliveredPreviewLimit: number;
  };
  leads: {
    reengage: OpsLeadRow[];
    recent: OpsLeadRow[];
    activeWindowDays: number;
  };
  historic: OpsHistoricLeadRow[];
  resultLine: {
    windowDays: number;
    totalLeads: number;
    activated: number;
    reengage: number;
    inProgress: number;
  };
};

function deliverySince(row: AltaRow, column: "domain_pending" | "building" | "delivered"): Date {
  switch (column) {
    case "delivered":
      return row.deliveredAt ?? row.paidAt ?? row.createdAt;
    case "domain_pending":
      return row.paidAt ?? row.createdAt;
    case "building":
    default:
      return row.domainRegisteredAt ?? row.paidAt ?? row.createdAt;
  }
}

function toDeliveryCard(
  row: AltaRow,
  column: "domain_pending" | "building" | "delivered",
  now: Date,
): OpsDeliveryCard {
  const since = deliverySince(row, column);
  const daysInColumn = daysBetween(since, now);
  const paidAt = row.paidAt;
  const stamp =
    column === "building" && paidAt
      ? `Activó el ${formatShortDate(paidAt)}`
      : paidAt
        ? `Pagó el ${formatShortDate(paidAt)}`
        : "";

  return {
    id: row.id,
    restaurantName: row.restaurantName,
    contactName: row.contactName,
    whatsappHref: normalizeWhatsAppHref(row.whatsapp),
    domainLabel: domainLabel(row),
    amountEur: amountEur(row),
    daysInColumn,
    staleWarning: column === "domain_pending" && daysInColumn > OPS_DOMAIN_OVERDUE_DAYS,
    opsNotes: row.opsNotes,
    stampLabel: stamp,
    paidAt: paidAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    siteUrl: row.domain ? `https://${row.domain}` : null,
    deliveryDays:
      row.deliveredAt && paidAt ? daysBetween(paidAt, row.deliveredAt) : null,
  };
}

function toLeadRow(row: AltaRow, group: OpsLeadGroupId, now: Date): OpsLeadRow {
  return {
    id: row.id,
    restaurantName: row.restaurantName,
    contactName: row.contactName,
    whatsappHref: normalizeWhatsAppHref(row.whatsapp),
    createdAt: row.createdAt.toISOString(),
    ageLabel: formatAgeLabel(row.createdAt, now),
    domainChoiceLabel: domainChoiceLabel(row),
    estado: deriveLeadEstado(row, now),
    opsNotes: row.opsNotes,
    group,
  };
}

function toHistoricRow(row: AltaRow, now: Date): OpsHistoricLeadRow {
  const desenlace = deriveHistoricDesenlace(row, now);
  return {
    id: row.id,
    restaurantName: row.restaurantName,
    contactName: row.contactName,
    whatsappHref: normalizeWhatsAppHref(row.whatsapp),
    createdAt: row.createdAt.toISOString(),
    ageLabel: formatShortDate(row.createdAt),
    domainChoiceLabel: domainChoiceLabel(row),
    desenlace,
    opsNotes: row.opsNotes,
    showContactActions: isPendingLead(row),
  };
}

export async function getOperationsBoard(
  appEnv: DashboardAppEnvFilter,
  envColumnReady: boolean,
): Promise<OpsBoardV3Data> {
  const now = new Date();
  const where = withNeonAppEnv(appEnv, envColumnReady);
  const rows = await getDb().select().from(altas).where(where).orderBy(desc(altas.createdAt));

  const domainPending: OpsDeliveryCard[] = [];
  const building: OpsDeliveryCard[] = [];
  const delivered: OpsDeliveryCard[] = [];
  const reengage: OpsLeadRow[] = [];
  const recent: OpsLeadRow[] = [];
  const historic: OpsHistoricLeadRow[] = [];

  let resultTotal = 0;
  let resultActivated = 0;
  let resultReengage = 0;
  let resultInProgress = 0;

  const resultSince = new Date(now.getTime() - OPS_RESULT_LINE_DAYS * MS_DAY);

  for (const row of rows) {
    historic.push(toHistoricRow(row, now));

    if (row.createdAt >= resultSince) {
      resultTotal += 1;
      if (row.status === "paid") {
        resultActivated += 1;
      } else if (isPendingLead(row)) {
        const group = deriveLeadGroup(row, now);
        if (group === "reengage") resultReengage += 1;
        else if (group === "recent") resultInProgress += 1;
      }
    }

    const deliveryColumn = deriveDeliveryColumn(row);
    if (deliveryColumn === "domain_pending") {
      domainPending.push(toDeliveryCard(row, "domain_pending", now));
    } else if (deliveryColumn === "building") {
      building.push(toDeliveryCard(row, "building", now));
    } else if (deliveryColumn === "delivered") {
      delivered.push(toDeliveryCard(row, "delivered", now));
    }

    if (isPendingLead(row) && isInLeadsActiveWindow(row, now)) {
      const group = deriveLeadGroup(row, now);
      if (group === "reengage") {
        reengage.push(toLeadRow(row, "reengage", now));
      } else if (group === "recent") {
        recent.push(toLeadRow(row, "recent", now));
      }
    }
  }

  const sortByRecent = <T extends { createdAt?: string; daysInColumn?: number }>(
    a: T,
    b: T,
    key: "createdAt" | "daysInColumn" = "createdAt",
  ) => {
    if (key === "daysInColumn") {
      return (b.daysInColumn ?? 0) - (a.daysInColumn ?? 0);
    }
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  };

  domainPending.sort((a, b) => sortByRecent(a, b, "daysInColumn"));
  building.sort((a, b) => sortByRecent(a, b, "daysInColumn"));
  delivered.sort((a, b) => sortByRecent(a, b, "createdAt"));
  reengage.sort((a, b) => sortByRecent(a, b));
  recent.sort((a, b) => sortByRecent(a, b));

  return {
    delivery: {
      domainPending,
      building,
      delivered,
      deliveredTotal: delivered.length,
      domainPendingOverdue: domainPending.filter((c) => c.staleWarning).length,
      deliveredPreviewLimit: OPS_DELIVERED_PREVIEW,
    },
    leads: {
      reengage,
      recent,
      activeWindowDays: OPS_LEADS_ACTIVE_DAYS,
    },
    historic,
    resultLine: {
      windowDays: OPS_RESULT_LINE_DAYS,
      totalLeads: resultTotal,
      activated: resultActivated,
      reengage: resultReengage,
      inProgress: resultInProgress,
    },
  };
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
  desenlace: string;
  estado: string;
  dominioRegistrado: string;
  entregada: string;
};

function desenlaceLabel(desenlace: OpsHistoricDesenlace): string {
  switch (desenlace.kind) {
    case "activated":
      return "activó";
    case "payment_left":
      return "dejó el pago";
    case "cooled":
      return "se enfrió";
    case "stalled":
      return `parado ${desenlace.days} días`;
    case "in_progress":
      return "en curso";
    default:
      return "—";
  }
}

export async function getOperationsCsvRows(
  appEnv: DashboardAppEnvFilter,
  envColumnReady: boolean,
): Promise<OpsCsvRow[]> {
  const now = new Date();
  const where = withNeonAppEnv(appEnv, envColumnReady);
  const rows = await getDb().select().from(altas).where(where).orderBy(desc(altas.createdAt));

  return rows.map((row) => {
    const amount =
      row.onetimeFeeAmount != null ? Number(row.onetimeFeeAmount).toFixed(2) : "0";
    const desenlace = deriveHistoricDesenlace(row, now);
    const desenlaceText = desenlaceLabel(desenlace);
    const deliveryColumn = deriveDeliveryColumn(row);
    let estado = desenlaceText;
    if (deliveryColumn === "domain_pending") estado = "dominio por registrar";
    else if (deliveryColumn === "building") estado = "construyendo";
    else if (deliveryColumn === "delivered") estado = "entregada";

    return {
      fecha: row.createdAt.toISOString().slice(0, 10),
      restaurante: row.restaurantName,
      contacto: row.contactName,
      telefono: row.whatsapp,
      email: row.customerEmail ?? "",
      tipoDominio: row.domainIsCustom ? "custom" : "subdominio",
      dominio: row.domain ?? "",
      importe: amount,
      desenlace: desenlaceText,
      estado,
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
    .set({ domainRegisteredAt: now })
    .where(eq(altas.id, altaId));
}

export async function markDelivered(altaId: string) {
  const now = new Date();
  await getDb()
    .update(altas)
    .set({ deliveredAt: now })
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
