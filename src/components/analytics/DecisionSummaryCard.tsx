import type { SummaryData } from "@/lib/analytics-dashboard.functions";
import { cn } from "@/lib/utils";

export function DecisionSummaryCard({
  summary,
  loading,
}: {
  summary: SummaryData | null;
  loading: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-card",
        summary?.sufficient && "border-emerald-200/60 bg-emerald-50/30",
      )}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Resumen
      </h2>
      {loading && !summary ? (
        <p className="mt-3 text-sm text-muted-foreground">Generando resumen…</p>
      ) : summary ? (
        <p className="mt-3 text-base leading-relaxed">{summary.sentence}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No se pudo cargar el resumen.</p>
      )}
    </section>
  );
}
