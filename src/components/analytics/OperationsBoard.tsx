import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import {
  exportOperationsCsv,
  fetchOperationsBoard,
  saveOpsNotes,
  setDelivered,
  setDomainRegistered,
  type OperationsBoardPayload,
} from "@/lib/operations.functions";
import type { OpsAltaCard, OpsColumnId } from "@/lib/operations.server";
import { cn } from "@/lib/utils";

type RangeDays = 7 | 30 | 90;

function OpsCard({
  card,
  columnId,
  onRefresh,
}: {
  card: OpsAltaCard;
  columnId: OpsColumnId;
  onRefresh: () => void;
}) {
  const saveNotes = useServerFn(saveOpsNotes);
  const markDomain = useServerFn(setDomainRegistered);
  const markDone = useServerFn(setDelivered);
  const [notes, setNotes] = useState(card.opsNotes ?? "");
  const [busy, setBusy] = useState(false);

  const saveNotesDebounced = async (value: string) => {
    try {
      await saveNotes({ data: { altaId: card.id, notes: value || null } });
    } catch (e) {
      console.error(e);
    }
  };

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

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3 shadow-card",
        columnId === "payment_abandoned" && "border-amber-300",
      )}
    >
      <h4 className="font-medium leading-tight">{card.restaurantName}</h4>
      <p className="mt-1 text-sm">
        {card.contactName} ·{" "}
        <a
          href={card.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {card.whatsapp}
        </a>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.domainLabel}
        {card.amountEur != null ? ` · ${card.amountEur.toLocaleString("es-ES")} €` : " · 0 €"}
      </p>
      <span
        className={cn(
          "mt-2 inline-block rounded-full px-2 py-0.5 text-xs tabular-nums",
          card.staleWarning
            ? "bg-amber-100 text-amber-900"
            : "bg-muted text-muted-foreground",
        )}
      >
        {card.daysInColumn}d en columna
      </span>
      <textarea
        className="mt-3 w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-xs"
        rows={2}
        placeholder="Notas ops…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void saveNotesDebounced(notes)}
      />
      {columnId === "domain_pending" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction(() => markDomain({ data: { altaId: card.id } }))}
          className="mt-2 w-full rounded-lg border px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          Dominio registrado ✓
        </button>
      ) : null}
      {columnId === "configuring" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction(() => markDone({ data: { altaId: card.id } }))}
          className="mt-2 w-full rounded-lg border px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          Página entregada ✓
        </button>
      ) : null}
    </article>
  );
}

export function OperationsBoard({
  rangeDays,
  onRangeChange,
}: {
  rangeDays: RangeDays;
  onRangeChange: (days: RangeDays) => void;
}) {
  const loadBoard = useServerFn(fetchOperationsBoard);
  const downloadCsv = useServerFn(exportOperationsCsv);
  const [data, setData] = useState<OperationsBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<OpsColumnId>>(new Set());
  const [csvBusy, setCsvBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await loadBoard({ data: { rangeDays } });
      setData(payload);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [loadBoard, rangeDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCsv = async () => {
    setCsvBusy(true);
    try {
      const { csv, filename } = await downloadCsv({ data: { rangeDays } });
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
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando tablero…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-sm text-destructive">
        No se pudo cargar el tablero de operaciones.
      </p>
    );
  }

  return (
    <div className="space-y-6 tabular-nums">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border p-0.5">
          {([7, 30, 90] as RangeDays[]).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onRangeChange(days)}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                rangeDays === days
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {days}d
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleCsv()}
          disabled={csvBusy}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Descargar CSV
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {data.columns.map((col) => {
          const showAll = expanded.has(col.id);
          const visibleCards = showAll ? col.cards : col.cards.slice(0, 10);
          const hasMore = col.total > 10 && !showAll;

          return (
            <section
              key={col.id}
              className={cn(
                "flex min-h-[200px] flex-col rounded-2xl border bg-muted/20 p-3",
                col.accent === "amber" && "border-amber-200",
              )}
            >
              <header className="mb-3">
                <h3 className="text-sm font-medium">{col.title}</h3>
                <p className="text-[10px] text-muted-foreground">{col.description}</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{col.total} total</p>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {visibleCards.map((card) => (
                  <OpsCard key={card.id} card={card} columnId={col.id} onRefresh={refresh} />
                ))}
                {col.total === 0 ? (
                  <p className="text-xs text-muted-foreground">Vacío</p>
                ) : null}
              </div>
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => setExpanded((s) => new Set(s).add(col.id))}
                  className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
                >
                  Ver todas ({col.total})
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
