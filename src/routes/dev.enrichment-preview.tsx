import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrechaStepPreview } from "@/components/asistente/BrechaStepPreview";
import { ChoiceRow } from "@/components/asistente/ChoiceRow";
import { PlaceFoundPanel } from "@/components/asistente/PlaceFoundPanel";
import { PlaceLinksPanel } from "@/components/asistente/PlaceLinksPanel";
import { ALTA_CURATED_PLACES } from "@/lib/alta-curated-places";
import { ALTA_REVIEW_PLACE_LABEL, ALTA_WRONG_PLACE_LABEL } from "@/lib/alta-copy";
import { enrichPlace } from "@/lib/alta.functions";
import { detectPowerUpFromProfile } from "@/lib/powerup-customer";
import type { PlaceProfile } from "@/lib/place-profile.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/enrichment-preview")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  component: DevEnrichmentPreview,
});

function DevEnrichmentPreview() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [profile, setProfile] = useState<PlaceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);

  const enrichPlaceFn = useServerFn(enrichPlace);
  const selected = ALTA_CURATED_PLACES[selectedIndex]!;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const result = await enrichPlaceFn({
        data: {
          place_id: selected.place_id,
          fallback_name: selected.fallback_name,
        },
      });
      setProfile(result.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enriquecer");
    } finally {
      setLoading(false);
    }
  }, [enrichPlaceFn, selected.place_id, selected.fallback_name]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const powerUp = profile ? detectPowerUpFromProfile(profile).status === "yes" : false;
  const typeMatch =
    profile && profile.website_type === selected.expected_website_type ? "✓" : profile ? "≠" : "—";

  return (
    <div className="container-narrow min-h-dvh space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-lg font-medium">Dev · Enrichment preview</h1>
        <p className="text-sm text-muted-foreground">
          Esqueleto etapa 5 — 5 website_types, datos reales de Places. Solo dev.
        </p>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950">
          Vista apilada solo para revisar composición. En el wizard real son 3 pantallas
          secuenciales (encontrado → confirmarInfo → brecha), no tres confirmaciones seguidas.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {ALTA_CURATED_PLACES.map((place, index) => (
          <button
            key={place.place_id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              index === selectedIndex
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30",
            )}
          >
            {place.tag}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 font-medium">{selected.tag}</span>
        <span className="rounded-md bg-muted px-2 py-1">
          esperado: {selected.expected_website_type}
        </span>
        {profile && (
          <>
            <span className="rounded-md bg-muted px-2 py-1">
              real: {profile.website_type} {typeMatch}
            </span>
            <span className="rounded-md bg-muted px-2 py-1">
              partial: {profile.enrichment_partial ? "sí" : "no"}
            </span>
            {powerUp && (
              <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-800">
                PowerUp
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => void loadProfile()}
          disabled={loading}
          className="ml-auto text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          Recargar
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enriqueciendo {selected.fallback_name}…
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {profile && !loading && (
        <div className="space-y-8">
          <PreviewSection title="1 · encontrado">
            <PlaceFoundPanel profile={profile} loading={false} />
            <Button className="mt-3 w-full" size="lg" disabled>
              Sí, es este (mock)
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground underline underline-offset-4">
              {ALTA_WRONG_PLACE_LABEL}
            </p>
          </PreviewSection>

          <PreviewSection title="2 · confirmarInfo">
            <PlaceLinksPanel profile={profile} />
            <Button className="mt-3 w-full" size="lg" variant="secondary" disabled>
              Confirmar (mock)
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground underline underline-offset-4">
              {ALTA_REVIEW_PLACE_LABEL}
            </p>
          </PreviewSection>

          <PreviewSection title="3 · brecha">
            <BrechaStepPreview
              profile={profile}
              powerupCustomer={powerUp ? "yes" : "no"}
            />
            <div className="mt-3">
              <ChoiceRow
                options={[
                  {
                    label: powerUp
                      ? "Activar página web con mi carta"
                      : "Usar dirección gratis",
                    onClick: () => console.log("[dev] opción principal"),
                  },
                  {
                    label: "Quiero dominio personalizado",
                    onClick: () => console.log("[dev] dominio custom"),
                  },
                ]}
              />
            </div>
          </PreviewSection>

          <div>
            <button
              type="button"
              onClick={() => setJsonOpen((o) => !o)}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              {jsonOpen ? "Ocultar" : "Ver"} PlaceProfile JSON
            </button>
            {jsonOpen && (
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
