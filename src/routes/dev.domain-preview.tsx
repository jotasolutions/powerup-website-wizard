import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { StepElegirDominio } from "@/components/asistente/StepElegirDominio";
import type { DomainPrefetchView } from "@/hooks/useDomainPrefetch";
import { cn } from "@/lib/utils";

type PreviewMode = "available" | "suggestion" | "degraded";

const MODES: Array<{ id: PreviewMode; label: string }> = [
  { id: "available", label: ".es libre" },
  { id: "suggestion", label: ".es cogido → sugerencia" },
  { id: "degraded", label: "Namecheap degradado" },
];

function mockPrefetch(mode: PreviewMode): DomainPrefetchView {
  const candidate = "voltereta-kioto.es";
  const freeSubdomain = "voltereta-kioto.powerup.menu";

  if (mode === "degraded") {
    return { status: "degraded", candidate, freeSubdomain, outcome: null };
  }

  if (mode === "suggestion") {
    return {
      status: "ready",
      candidate,
      freeSubdomain,
      outcome: {
        candidate,
        primary: { domain: "voltereta-kioto.com", price: 17.9 },
        unavailableCandidate: candidate,
        moreAlternatives: [
          { domain: "voltereta-kioto.menu", price: 21.9 },
          { domain: "elvoltereta-kioto.es", price: 16.9 },
        ],
        raw: { available: false, alternatives: [] },
      },
    };
  }

  return {
    status: "ready",
    candidate,
    freeSubdomain,
    outcome: {
      candidate,
      primary: { domain: candidate, price: 14.9 },
      moreAlternatives: [],
      raw: { available: true, price: 14.9 },
    },
  };
}

export const Route = createFileRoute("/dev/domain-preview")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  component: DevDomainPreview,
});

function DevDomainPreview() {
  const [mode, setMode] = useState<PreviewMode>("available");
  const prefetch = mockPrefetch(mode);

  return (
    <div className="container-narrow min-h-dvh space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-lg font-medium">Dev · Domain preview</h1>
        <p className="text-sm text-muted-foreground">
          Etapa 6 — prefetch invisible hasta elegirDominio. Solo dev.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              mode === m.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white text-muted-foreground hover:border-primary/40",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
        <StepElegirDominio
          prefetch={prefetch}
          onAvailable={(domain, price) => {
            alert(`Seleccionado: ${domain} (${price} €)`);
          }}
          onSkip={() => {
            alert(`Skip → ${prefetch.freeSubdomain}`);
          }}
          checkDomainFn={async () => {
            await new Promise((r) => setTimeout(r, 800));
            return { available: true, price: 12 };
          }}
        />
      </section>
    </div>
  );
}
