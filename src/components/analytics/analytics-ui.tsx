import type { LucideIcon, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LOW_SAMPLE_THRESHOLD } from "@/lib/analytics-narrative";

export type PanelAccentTone = "green" | "amber" | "blue" | "gray" | "neutral";

export function panelAccentClass(tone: PanelAccentTone): string {
  switch (tone) {
    case "green":
      return "bg-panel-green-bg text-panel-green-text";
    case "amber":
      return "bg-panel-amber-bg text-panel-amber-text";
    case "blue":
      return "bg-panel-blue-bg text-panel-blue-text";
    case "gray":
      return "bg-panel-sunken text-panel-muted";
    default:
      return "text-panel-secondary";
  }
}

export function PanelCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border-[0.5px] border-panel-border bg-white p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelPillGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function PanelPill({
  active,
  children,
  className,
  ...props
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border-[0.5px] border-panel-border-strong bg-transparent px-3 py-1 text-xs text-panel-fg transition-colors",
        active && "border-panel-muted bg-panel-sunken font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PanelPillSeparator() {
  return <span className="mx-1 inline-block h-[18px] w-px bg-panel-border" aria-hidden />;
}

export type SectionLight = "green" | "amber" | "gray";

const SECTION_DOT: Record<SectionLight, string> = {
  green: "bg-panel-green-solid",
  amber: "bg-panel-amber-dot",
  gray: "bg-panel-border-strong",
};

export function SectionHeading({
  title,
  subtitle,
  light = "gray",
}: {
  title: string;
  subtitle?: string;
  light?: SectionLight;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span
        className={cn("inline-block h-2 w-2 shrink-0 rounded-full", SECTION_DOT[light])}
        aria-hidden
      />
      <span className="text-[13px] font-medium text-panel-fg">{title}</span>
      {subtitle ? (
        <span className="text-[13px] text-panel-muted">{subtitle}</span>
      ) : null}
    </div>
  );
}

export function InsightTile({
  icon: Icon,
  iconTone = "blue",
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  iconTone?: PanelAccentTone;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PanelCard className={cn("flex gap-3 p-4", className)}>
      <div
        className={cn(
          "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg",
          panelAccentClass(iconTone),
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-panel-fg">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-panel-secondary">{children}</div>
      </div>
    </PanelCard>
  );
}

export function DevProductionEnvBanner() {
  return (
    <PanelSunkenStrip className="border border-panel-amber-bg/80 bg-panel-amber-bg/30 text-panel-amber-text">
      En local, los eventos del wizard llevan{" "}
      <code className="text-[11px]">app_env: development</code>. Usa{" "}
      <strong className="font-medium">Todos</strong> en el selector de entorno para ver tus pruebas.
    </PanelSunkenStrip>
  );
}

export function PanelSunkenStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg bg-panel-sunken px-4 py-2.5 text-[13px] text-panel-secondary",
        className,
      )}
    >
      {children}
    </div>
  );
}

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
    <PanelCard className={className}>
      <h3 className="text-[13px] font-medium text-panel-fg">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-panel-muted">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </PanelCard>
  );
}

export function TileError({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-panel-sunken px-3 py-2 text-xs text-panel-muted">{message}</p>
  );
}

export function LowSampleNote({ n }: { n: number }) {
  if (n >= LOW_SAMPLE_THRESHOLD) return null;
  return (
    <p className="mt-2 text-xs text-panel-muted">
      Muestra insuficiente para interpretar porcentajes (n={n}).
    </p>
  );
}

export function renderTile<T>(
  result: { ok: true; data: T } | { ok: false; error: string },
  render: (data: T) => ReactNode,
) {
  if (!result.ok) return <TileError message={result.error} />;
  return render(result.data);
}
