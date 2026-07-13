import {
  MS_DAY,
  MS_HOUR,
  OPS_CHECKOUT_ABANDON_HOURS,
  OPS_COOLED_DAYS,
  OPS_LEADS_ACTIVE_DAYS,
  OPS_STALLED_DAYS,
} from "./ops-config";

/** Subconjunto de `altas` necesario para derivar estado ops. */
export type OpsAltaRow = {
  id: string;
  createdAt: Date;
  status: "pending_payment" | "paid";
  paidAt: Date | null;
  checkoutStartedAt: Date | null;
  stripeSessionId: string | null;
  domainIsCustom: boolean;
  domainRegisteredAt: Date | null;
  deliveredAt: Date | null;
};

export type OpsLeadChip =
  | { kind: "payment_left" }
  | { kind: "stalled"; days: number };

export type OpsLeadEstado =
  | OpsLeadChip
  | { kind: "new" }
  | { kind: "in_progress" };

export type OpsHistoricDesenlace =
  | { kind: "activated" }
  | { kind: "payment_left" }
  | { kind: "cooled" }
  | { kind: "stalled"; days: number }
  | { kind: "in_progress" };

export type OpsDeliveryColumnId = "domain_pending" | "building" | "delivered";

export type OpsLeadGroupId = "reengage" | "recent";

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_DAY));
}

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_HOUR);
}

export function hasCheckout(row: OpsAltaRow): boolean {
  return row.checkoutStartedAt != null || row.stripeSessionId != null;
}

export function isActivated(row: OpsAltaRow): boolean {
  return row.status === "paid";
}

export function isPendingLead(row: OpsAltaRow): boolean {
  return row.status === "pending_payment";
}

export function isInLeadsActiveWindow(row: OpsAltaRow, now: Date): boolean {
  return daysBetween(row.createdAt, now) <= OPS_LEADS_ACTIVE_DAYS;
}

/** Chip urgente para grupo reenganchar (null = sin chip de abandono). */
export function deriveLeadChip(row: OpsAltaRow, now: Date): OpsLeadChip | null {
  if (!isPendingLead(row)) return null;

  if (row.checkoutStartedAt != null) {
    if (hoursBetween(row.checkoutStartedAt, now) > OPS_CHECKOUT_ABANDON_HOURS) {
      return { kind: "payment_left" };
    }
    return null;
  }

  if (hasCheckout(row)) {
    return null;
  }

  const stalledDays = daysBetween(row.createdAt, now);
  if (stalledDays > OPS_STALLED_DAYS) {
    return { kind: "stalled", days: stalledDays };
  }

  return null;
}

export function deriveLeadGroup(row: OpsAltaRow, now: Date): OpsLeadGroupId | null {
  if (!isPendingLead(row)) return null;
  return deriveLeadChip(row, now) ? "reengage" : "recent";
}

/** Columna Estado en la vista de trabajo (nunca vacía para pending activos). */
export function deriveLeadEstado(row: OpsAltaRow, now: Date): OpsLeadEstado | null {
  if (!isPendingLead(row)) return null;

  const chip = deriveLeadChip(row, now);
  if (chip) return chip;

  const ageDays = daysBetween(row.createdAt, now);
  if (ageDays <= OPS_STALLED_DAYS) {
    return { kind: "new" };
  }

  return { kind: "in_progress" };
}

/**
 * Desenlace en histórico: terminales o estado activo (chip / «en curso»).
 * Nunca devuelve null para filas pending o paid.
 */
export function deriveHistoricDesenlace(row: OpsAltaRow, now: Date): OpsHistoricDesenlace {
  if (isActivated(row)) {
    return { kind: "activated" };
  }

  if (!isPendingLead(row)) {
    return { kind: "in_progress" };
  }

  if (row.checkoutStartedAt != null) {
    if (hoursBetween(row.checkoutStartedAt, now) > OPS_CHECKOUT_ABANDON_HOURS) {
      return { kind: "payment_left" };
    }
    return { kind: "in_progress" };
  }

  if (hasCheckout(row)) {
    return { kind: "in_progress" };
  }

  const ageDays = daysBetween(row.createdAt, now);
  if (ageDays > OPS_COOLED_DAYS) {
    return { kind: "cooled" };
  }

  if (ageDays > OPS_STALLED_DAYS) {
    return { kind: "stalled", days: ageDays };
  }

  return { kind: "in_progress" };
}

export function deriveDeliveryColumn(row: OpsAltaRow): OpsDeliveryColumnId | null {
  if (!isActivated(row)) return null;

  if (row.deliveredAt) {
    return "delivered";
  }

  if (row.domainIsCustom && !row.domainRegisteredAt) {
    return "domain_pending";
  }

  return "building";
}

export function isCooledLead(row: OpsAltaRow, now: Date): boolean {
  return deriveHistoricDesenlace(row, now).kind === "cooled";
}
