import { Loader2 } from "lucide-react";
import type { PlaceProfile } from "@/lib/place-profile.types";
import { buildPlaceDataLine } from "@/lib/place-display";
import { cn } from "@/lib/utils";

type Props = {
  profile: PlaceProfile | null;
  loading?: boolean;
  className?: string;
};

export function PlaceFoundPanel({ profile, loading = false, className }: Props) {
  const dataLine = profile ? buildPlaceDataLine(profile) : null;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/70 shadow-sm", className)}>
      <div className="bg-brand-gradient px-4 py-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Buscando tu ficha…</span>
          </div>
        ) : (
          <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-primary-foreground">
            {profile?.display_name ?? "—"}
          </h2>
        )}
      </div>
      {!loading && profile && (
        <div className="border-t border-border/40 bg-card px-4 py-3">
          {dataLine ? (
            <p className="text-sm leading-relaxed text-muted-foreground tabular-nums">{dataLine}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {profile.enrichment_partial ? "Ficha parcial de Google" : "Sin datos adicionales"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
