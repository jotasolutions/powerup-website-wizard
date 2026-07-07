import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LOW_SAMPLE_THRESHOLD } from "@/lib/analytics-narrative";

export function TileShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <h3 className="text-sm font-medium">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function TileError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function LowSampleNote({ n }: { n: number }) {
  if (n >= LOW_SAMPLE_THRESHOLD) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Muestra insuficiente para interpretar porcentajes (n={n}).
    </p>
  );
}

export function renderTile<T>(result: { ok: true; data: T } | { ok: false; error: string }, render: (data: T) => ReactNode) {
  if (!result.ok) return <TileError message={result.error} />;
  return render(result.data);
}
