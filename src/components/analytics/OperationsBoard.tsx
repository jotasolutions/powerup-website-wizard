import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, ExternalLink, Loader2, StickyNote } from "lucide-react";
import {
  exportOperationsCsv,
  fetchOperationsBoard,
  saveOpsNotes,
  setDelivered,
  setDomainRegistered,
  type OperationsBoardPayload,
} from "@/lib/operations.functions";
import type {
  OpsDeliveryCard,
  OpsHistoricLeadRow,
  OpsLeadRow,
} from "@/lib/operations.server";
import type { OpsHistoricDesenlace, OpsLeadEstado } from "@/lib/ops-derive";
import {
  opsChipPaymentLeftTitle,
  OPS_CHIP_STALLED_TITLE,
  opsReengageGroupLegend,
} from "@/lib/ops-config";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { OpsWhatsAppButton } from "./OpsWhatsAppButton";
import { cn } from "@/lib/utils";

const CHIP_WARN =
  "rounded-full bg-panel-amber-bg px-2 py-0.5 text-[11px] text-panel-amber-text";

function PaymentLeftChip() {
  return (
    <span title={opsChipPaymentLeftTitle()} className={CHIP_WARN}>
      dejó el pago
    </span>
  );
}

function StalledChip({ days }: { days: number }) {
  return (
    <span title={OPS_CHIP_STALLED_TITLE} className={cn(CHIP_WARN, "tabular-nums")}>
      parado {days} días
    </span>
  );
}

function EstadoChip({ estado }: { estado: OpsLeadEstado }) {
  switch (estado.kind) {
    case "payment_left":
      return <PaymentLeftChip />;
    case "stalled":
      return <StalledChip days={estado.days} />;
    case "new":
      return (
        <span className="rounded-full bg-panel-blue-bg px-2 py-0.5 text-[11px] text-panel-blue-text">
          nuevo
        </span>
      );
    case "in_progress":
      return (
        <span className="rounded-full bg-panel-sunken px-2 py-0.5 text-[11px] text-panel-muted">
          en curso
        </span>
      );
    default:
      return null;
  }
}

function DesenlaceChip({ desenlace }: { desenlace: OpsHistoricDesenlace }) {
  switch (desenlace.kind) {
    case "activated":
      return (
        <span className="rounded-full bg-panel-green-bg px-2 py-0.5 text-[11px] text-panel-green-text">
          activó ✓
        </span>
      );
    case "payment_left":
      return <PaymentLeftChip />;
    case "cooled":
      return (
        <span className="rounded-full bg-panel-sunken px-2 py-0.5 text-[11px] text-panel-muted">
          se enfrió
        </span>
      );
    case "stalled":
      return <StalledChip days={desenlace.days} />;
    case "in_progress":
      return (
        <span className="rounded-full bg-panel-sunken px-2 py-0.5 text-[11px] text-panel-muted">
          en curso
        </span>
      );
    default:
      return null;
  }
}

function OpsNotesField({
  altaId,
  initialNotes,
  onSaved,
}: {
  altaId: string;
  initialNotes: string | null;
  onSaved?: () => void;
}) {
  const saveNotes = useServerFn(saveOpsNotes);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  const persist = async (value: string) => {
    try {
      await saveNotes({ data: { altaId, notes: value.trim() || null } });
      onSaved?.();
    } catch (e) {
      console.error(e);
    }
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        className="w-full min-w-0 resize-none rounded-md border-[0.5px] border-panel-border bg-white px-2 py-1 text-[11px] text-panel-fg"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          void persist(notes);
          setEditing(false);
        }}
      />
    );
  }

  if (initialNotes?.trim()) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex max-w-full items-center gap-1 truncate text-[11px] text-panel-secondary hover:text-panel-fg"
      >
        <StickyNote className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{initialNotes}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[12px] text-panel-muted hover:text-panel-secondary"
    >
      + nota
    </button>
  );
}

function DeliveryMetaLine({ card }: { card: OpsDeliveryCard }) {
  const amount =
    card.amountEur != null
      ? `${card.amountEur.toLocaleString("es-ES")} €`
      : "0 €";
  return (
    <p className="mt-0.5 text-xs text-panel-secondary">
      {card.contactName} · {card.domainLabel} · <span className="tabular-nums">{amount}</span>
    </p>
  );
}

function DeliveryKanbanCard({
  card,
  variant,
  onRefresh,
}: {
  card: OpsDeliveryCard;
  variant: "domain_pending" | "building" | "delivered";
  onRefresh: () => void;
}) {
  const markDomain = useServerFn(setDomainRegistered);
  const markDone = useServerFn(setDelivered);
  const [busy, setBusy] = useState(false);

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const daysLabel =
    card.daysInColumn === 1 ? "1 día" : `${card.daysInColumn} días`;

  return (
    <article
      className={cn(
        "rounded-lg border-[0.5px] border-panel-border bg-white p-2.5",
        variant === "domain_pending" &&
          card.staleWarning &&
          "border-l-[3px] border-l-panel-amber-dot rounded-l-none",
        variant === "delivered" && "opacity-85",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-medium leading-tight text-panel-fg">
          {variant === "delivered" ? (
            <>
              <Check className="mr-0.5 inline size-3.5 text-panel-green-text" aria-hidden />
              {card.restaurantName}
            </>
          ) : (
            card.restaurantName
          )}
        </h4>
        <span
          className={cn(
            "shrink-0 text-[11px] tabular-nums",
            variant === "domain_pending" && card.staleWarning
              ? "font-medium text-panel-amber-text"
              : "text-panel-muted",
          )}
        >
          {variant === "delivered" && card.deliveredAt
            ? new Date(card.deliveredAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })
            : daysLabel}
        </span>
      </div>

      {variant === "delivered" ? (
        <p className="mt-0.5 text-xs text-panel-secondary">
          {card.siteUrl ? (
            <a
              href={card.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-panel-blue-text hover:underline"
            >
              {card.domainLabel}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            card.domainLabel
          )}
          {card.deliveryDays != null ? (
            <>
              {" "}
              · entregada en <span className="tabular-nums">{card.deliveryDays} días</span>
            </>
          ) : null}
        </p>
      ) : (
        <>
          <DeliveryMetaLine card={card} />
          {card.stampLabel ? (
            <p className="mt-1 text-[11px] tabular-nums text-panel-muted">{card.stampLabel}</p>
          ) : null}
        </>
      )}

      {variant === "domain_pending" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction(() => markDomain({ data: { altaId: card.id } }))}
          className="mt-2 w-full rounded-md border-[0.5px] border-panel-border-strong bg-white px-2.5 py-1.5 text-xs font-medium text-panel-fg hover:bg-panel-sunken disabled:opacity-50"
        >
          Dominio registrado ✓
        </button>
      ) : null}
      {variant === "building" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction(() => markDone({ data: { altaId: card.id } }))}
          className="mt-2 w-full rounded-md border-[0.5px] border-panel-border-strong bg-white px-2.5 py-1.5 text-xs font-medium text-panel-fg hover:bg-panel-sunken disabled:opacity-50"
        >
          Página entregada ✓
        </button>
      ) : null}
    </article>
  );
}

const LEAD_GRID =
  "grid grid-cols-1 items-center gap-2 px-4 py-2.5 text-[13px] sm:grid-cols-[2.2fr_1.4fr_1fr_1fr_1.6fr] sm:gap-2";

function LeadTableHeader({ desenlaceColumn = false }: { desenlaceColumn?: boolean }) {
  return (
    <div
      className={cn(
        LEAD_GRID,
        "border-b-[0.5px] border-panel-border py-2 text-[11px] text-panel-muted",
      )}
    >
      <span>Restaurante</span>
      <span>Contacto</span>
      <span>Eligió</span>
      <span>{desenlaceColumn ? "Desenlace" : "Estado"}</span>
      <span>Registro de contacto</span>
    </div>
  );
}

function LeadWorkRow({ row, onRefresh }: { row: OpsLeadRow; onRefresh: () => void }) {
  return (
    <div className={cn(LEAD_GRID, "border-t-[0.5px] border-panel-border")}>
      <span className="font-medium text-panel-fg">
        {row.restaurantName}{" "}
        <span className="text-[11px] font-normal tabular-nums text-panel-muted">
          {row.ageLabel}
        </span>
      </span>
      <span className="text-panel-secondary">{row.contactName}</span>
      <span className="text-panel-secondary">{row.domainChoiceLabel}</span>
      <span>{row.estado ? <EstadoChip estado={row.estado} /> : null}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <OpsWhatsAppButton altaId={row.id} href={row.whatsappHref} />
        <OpsNotesField altaId={row.id} initialNotes={row.opsNotes} onSaved={onRefresh} />
      </span>
    </div>
  );
}

function HistoricLeadRow({ row, onRefresh }: { row: OpsHistoricLeadRow; onRefresh: () => void }) {
  return (
    <div className={cn(LEAD_GRID, "border-t-[0.5px] border-panel-border")}>
      <span className="font-medium text-panel-fg">
        {row.restaurantName}{" "}
        <span className="text-[11px] font-normal tabular-nums text-panel-muted">
          {row.ageLabel}
        </span>
      </span>
      <span className="text-panel-secondary">{row.contactName}</span>
      <span className="text-panel-secondary">{row.domainChoiceLabel}</span>
      <span>
        <DesenlaceChip desenlace={row.desenlace} />
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {row.showContactActions ? (
          <>
            <OpsWhatsAppButton altaId={row.id} href={row.whatsappHref} />
            <OpsNotesField altaId={row.id} initialNotes={row.opsNotes} onSaved={onRefresh} />
          </>
        ) : (
          <span className="text-[11px] text-panel-muted">—</span>
        )}
      </span>
    </div>
  );
}

function matchesHistoricSearch(row: OpsHistoricLeadRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const phoneNeedle = needle.replace(/\D/g, "");
  const phoneHay = row.whatsappHref.replace(/\D/g, "");
  return (
    row.restaurantName.toLowerCase().includes(needle) ||
    row.contactName.toLowerCase().includes(needle) ||
    (phoneNeedle.length > 0 && phoneHay.includes(phoneNeedle))
  );
}

export function OperationsBoard({ appEnv }: { appEnv: DashboardAppEnvFilter }) {
  const loadBoard = useServerFn(fetchOperationsBoard);
  const downloadCsv = useServerFn(exportOperationsCsv);
  const [data, setData] = useState<OperationsBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [historicExpanded, setHistoricExpanded] = useState(false);
  const [showAllDelivered, setShowAllDelivered] = useState(false);
  const [historicQuery, setHistoricQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await loadBoard({ data: { appEnv } });
      setData(payload);
    } catch (e) {
      console.error(e);
      setData(null);
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadBoard, appEnv]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredHistoric = useMemo(() => {
    if (!data) return [];
    return data.historic.filter((row) => matchesHistoricSearch(row, historicQuery));
  }, [data, historicQuery]);

  const visibleDelivered = useMemo(() => {
    if (!data) return [];
    const { delivered, deliveredPreviewLimit, deliveredTotal } = data.delivery;
    if (showAllDelivered || deliveredTotal <= deliveredPreviewLimit) {
      return delivered;
    }
    return delivered.slice(0, deliveredPreviewLimit);
  }, [data, showAllDelivered]);

  const handleCsv = async () => {
    setCsvBusy(true);
    try {
      const { csv, filename } = await downloadCsv({ data: { appEnv } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setCsvBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-panel-muted">
        <Loader2 className="size-5 animate-spin" />
        Cargando operaciones…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-sm text-destructive">
        No se pudo cargar operaciones.
        {loadError ? (
          <span className="mt-2 block text-xs text-panel-muted">{loadError}</span>
        ) : null}
      </p>
    );
  }

  const { delivery, leads, resultLine, historic } = data;
  const overdueLabel =
    delivery.domainPendingOverdue === 1
      ? "1 atrasado"
      : delivery.domainPendingOverdue > 1
        ? `${delivery.domainPendingOverdue} atrasados`
        : null;

  return (
    <div className={cn("space-y-7 tabular-nums", loading && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void handleCsv()}
          disabled={csvBusy}
          className="inline-flex items-center gap-2 rounded-full border-[0.5px] border-panel-border bg-transparent px-3 py-1 text-xs text-panel-fg hover:bg-panel-sunken disabled:opacity-50"
        >
          <Download className="size-3.5" aria-hidden />
          Descargar CSV
        </button>
      </div>

      {/* Entrega */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <h2 className="text-[13px] font-medium text-panel-fg">Entrega</h2>
          <span className="text-[13px] text-panel-muted">
            clientes que activaron — siempre visible al completo
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-panel-sunken p-3">
            <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-[13px] font-medium text-panel-fg">Dominio por registrar</h3>
              {overdueLabel ? (
                <span className="text-xs font-medium text-panel-amber-text">{overdueLabel}</span>
              ) : (
                <span className="text-xs text-panel-muted">{delivery.domainPending.length}</span>
              )}
            </div>
            <div className="space-y-2">
              {delivery.domainPending.map((card) => (
                <DeliveryKanbanCard
                  key={card.id}
                  card={card}
                  variant="domain_pending"
                  onRefresh={refresh}
                />
              ))}
              {delivery.domainPending.length === 0 ? (
                <p className="py-4 text-center text-xs text-panel-muted">Vacío</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl bg-panel-sunken p-3">
            <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-[13px] font-medium text-panel-fg">Construyendo</h3>
              <span className="text-xs text-panel-muted">{delivery.building.length}</span>
            </div>
            <div className="space-y-2">
              {delivery.building.map((card) => (
                <DeliveryKanbanCard
                  key={card.id}
                  card={card}
                  variant="building"
                  onRefresh={refresh}
                />
              ))}
              {delivery.building.length === 0 ? (
                <p className="py-4 text-center text-xs text-panel-muted">Vacío</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl bg-panel-sunken p-3">
            <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-[13px] font-medium text-panel-fg">
                Entregada{" "}
                <span className="font-normal text-panel-muted">→ customer success</span>
              </h3>
              <span className="text-xs text-panel-muted">{delivery.deliveredTotal}</span>
            </div>
            <div className="space-y-2">
              {visibleDelivered.map((card) => (
                <DeliveryKanbanCard
                  key={card.id}
                  card={card}
                  variant="delivered"
                  onRefresh={refresh}
                />
              ))}
              {delivery.deliveredTotal === 0 ? (
                <p className="py-4 text-center text-xs text-panel-muted">Vacío</p>
              ) : null}
            </div>
            {delivery.deliveredTotal > delivery.deliveredPreviewLimit ? (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowAllDelivered((v) => !v)}
                  className="text-[11px] text-panel-muted hover:text-panel-secondary"
                >
                  {showAllDelivered ? "ver menos" : "ver todas"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Leads trabajo o histórico */}
      {!historicExpanded ? (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-medium text-panel-fg">Leads</h2>
              <span className="text-[13px] text-panel-muted">
                aún no han activado · últimos {leads.activeWindowDays} días
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHistoricExpanded(true)}
              className="text-[11px] text-panel-muted hover:text-panel-secondary"
            >
              ver histórico ({historic.length})
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-panel-sunken px-3.5 py-2 text-[13px]">
            <span className="text-panel-secondary">Últimos {resultLine.windowDays} días:</span>
            <span className="font-medium text-panel-fg">{resultLine.totalLeads} leads</span>
            <span className="text-panel-muted">→</span>
            <span className="font-medium text-panel-green-text">
              {resultLine.activated} activaron la prueba ✓
            </span>
            <span className="text-panel-muted">·</span>
            <span className="font-medium text-panel-amber-text">
              {resultLine.reengage} para reenganchar
            </span>
            <span className="text-panel-muted">·</span>
            <span className="text-panel-secondary">{resultLine.inProgress} recientes en curso</span>
          </div>

          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full bg-panel-amber-dot"
              aria-hidden
            />
            <span className="text-xs font-medium text-panel-amber-text">Para reenganchar</span>
            <span className="text-xs text-panel-muted">
              dejaron el pago o llevan días parados — este es el trabajo
            </span>
          </div>
          <p className="mb-2 text-[11px] text-panel-muted">{opsReengageGroupLegend()}</p>
          <div className="mb-3.5 overflow-hidden rounded-xl border-[0.5px] border-[#EAC58A] bg-white">
            <LeadTableHeader />
            {leads.reengage.map((row) => (
              <LeadWorkRow key={row.id} row={row} onRefresh={refresh} />
            ))}
            {leads.reengage.length === 0 ? (
              <p className="py-4 text-center text-xs text-panel-muted">
                Nadie para reenganchar ahora ✓
              </p>
            ) : null}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-panel-border-strong" aria-hidden />
            <span className="text-xs font-medium text-panel-secondary">Recientes — en curso</span>
            <span className="text-xs text-panel-muted">acaban de entrar, dejarlos avanzar solos</span>
          </div>
          <div className="overflow-hidden rounded-xl border-[0.5px] border-panel-border bg-white">
            {leads.recent.length > 0 ? (
              leads.recent.map((row) => <LeadWorkRow key={row.id} row={row} onRefresh={refresh} />)
            ) : (
              <p className="py-4 text-center text-xs text-panel-muted">Sin leads recientes</p>
            )}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-medium text-panel-fg">Histórico de leads</h2>
              <span className="text-[13px] text-panel-muted">
                todos · {historic.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setHistoricExpanded(false);
                setHistoricQuery("");
              }}
              className="text-[11px] text-panel-muted hover:text-panel-secondary"
            >
              ver solo recientes
            </button>
          </div>
          <input
            type="search"
            value={historicQuery}
            onChange={(e) => setHistoricQuery(e.target.value)}
            placeholder="Buscar por restaurante, contacto o teléfono…"
            className="mb-2.5 w-full rounded-lg border-[0.5px] border-panel-border-strong bg-white px-3 py-1.5 text-[13px] text-panel-fg placeholder:text-panel-muted"
          />
          <div className="overflow-hidden rounded-xl border-[0.5px] border-panel-border bg-white">
            <LeadTableHeader desenlaceColumn />
            {filteredHistoric.map((row) => (
              <HistoricLeadRow key={row.id} row={row} onRefresh={refresh} />
            ))}
            {filteredHistoric.length === 0 ? (
              <p className="py-4 text-center text-xs text-panel-muted">Sin resultados</p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
