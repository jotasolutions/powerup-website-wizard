import { describe, expect, it } from "vitest";
import { MS_DAY, MS_HOUR } from "./ops-config";
import {
  deriveHistoricDesenlace,
  deriveLeadChip,
  deriveLeadEstado,
  deriveLeadGroup,
  hasCheckout,
  type OpsAltaRow,
} from "./ops-derive";

const NOW = new Date("2026-07-13T12:00:00Z");
const ALTA_ID = "00000000-0000-0000-0000-000000000001";

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MS_DAY);
}

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * MS_HOUR);
}

function row(overrides: Partial<OpsAltaRow> = {}): OpsAltaRow {
  return {
    id: ALTA_ID,
    createdAt: daysAgo(1),
    status: "pending_payment",
    paidAt: null,
    checkoutStartedAt: null,
    stripeSessionId: null,
    domainIsCustom: false,
    domainRegisteredAt: null,
    deliveredAt: null,
    ...overrides,
  };
}

describe("ops-derive v3", () => {
  it("1 — reintento de checkout reinicia el reloj de 48h (sin chip dejó el pago)", () => {
    const lead = row({
      createdAt: daysAgo(20),
      checkoutStartedAt: hoursAgo(10),
      stripeSessionId: "cs_test_retry",
    });
    expect(deriveLeadChip(lead, NOW)).toBeNull();
    expect(deriveLeadGroup(lead, NOW)).toBe("recent");
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "in_progress" });
  });

  it("2 — legacy stripe_session_id sin checkout_started_at: con checkout, sin chip", () => {
    const lead = row({
      createdAt: daysAgo(5),
      stripeSessionId: "cs_legacy",
      checkoutStartedAt: null,
    });
    expect(hasCheckout(lead)).toBe(true);
    expect(deriveLeadChip(lead, NOW)).toBeNull();
    expect(deriveLeadGroup(lead, NOW)).toBe("recent");
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "in_progress" });
  });

  it("3 — sin checkout en Neon se trata como parado (no dejó el pago)", () => {
    const lead = row({ createdAt: daysAgo(6) });
    expect(hasCheckout(lead)).toBe(false);
    expect(deriveLeadChip(lead, NOW)).toEqual({ kind: "stalled", days: 6 });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "stalled", days: 6 });
  });

  it("4 — mock paid directo → activó", () => {
    const lead = row({ status: "paid", paidAt: NOW });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "activated" });
    expect(deriveLeadChip(lead, NOW)).toBeNull();
  });

  it("5 — pending 5 días con checkout hace 12h: activo normal sin chip urgente", () => {
    const lead = row({
      createdAt: daysAgo(5),
      checkoutStartedAt: hoursAgo(12),
      stripeSessionId: "cs_recent",
    });
    expect(deriveLeadChip(lead, NOW)).toBeNull();
    expect(deriveLeadGroup(lead, NOW)).toBe("recent");
    expect(deriveLeadEstado(lead, NOW)).toEqual({ kind: "in_progress" });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "in_progress" });
  });

  it("6 — pending 20 días sin checkout: chip parado y desenlace se enfrió", () => {
    const lead = row({ createdAt: daysAgo(20) });
    expect(deriveLeadChip(lead, NOW)).toEqual({ kind: "stalled", days: 20 });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "cooled" });
  });

  it("7 — pending 20 días con checkout hace 72h: dejó el pago", () => {
    const lead = row({
      createdAt: daysAgo(20),
      checkoutStartedAt: hoursAgo(72),
      stripeSessionId: "cs_abandoned",
    });
    expect(deriveLeadChip(lead, NOW)).toEqual({ kind: "payment_left" });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "payment_left" });
  });

  it("8 — status paid sin paid_at: activó por status", () => {
    const lead = row({ status: "paid", paidAt: null });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "activated" });
  });

  it("9 — paid_at backfill ≈ created_at sigue siendo activó", () => {
    const created = daysAgo(30);
    const lead = row({ status: "paid", createdAt: created, paidAt: created });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "activated" });
  });

  it("10 — lead 2 días sin checkout: nuevo, no se enfrió", () => {
    const lead = row({ createdAt: daysAgo(2) });
    expect(deriveLeadChip(lead, NOW)).toBeNull();
    expect(deriveLeadEstado(lead, NOW)).toEqual({ kind: "new" });
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "in_progress" });
  });

  it("11 — regla vieja de abandono por edad muere: 16 días sin checkout es parado, no columna aparte", () => {
    const lead = row({ createdAt: daysAgo(16) });
    expect(deriveLeadChip(lead, NOW)).toEqual({ kind: "stalled", days: 16 });
    expect(deriveLeadGroup(lead, NOW)).toBe("reengage");
    expect(deriveHistoricDesenlace(lead, NOW)).toEqual({ kind: "cooled" });
  });

  it("12 — pending con checkout <48h: desenlace activo en curso, nunca vacío", () => {
    const lead = row({
      createdAt: daysAgo(4),
      checkoutStartedAt: hoursAgo(20),
      stripeSessionId: "cs_in_progress",
    });
    const desenlace = deriveHistoricDesenlace(lead, NOW);
    expect(desenlace).toEqual({ kind: "in_progress" });
    expect(desenlace).not.toBeNull();
    expect(deriveLeadEstado(lead, NOW)).toEqual({ kind: "in_progress" });
  });
});
