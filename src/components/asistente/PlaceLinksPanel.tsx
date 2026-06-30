import type { PlaceProfile } from "@/lib/place-profile.types";
import { isPowerUpMenuUri } from "@/lib/website-classifier";
import { cn } from "@/lib/utils";

type Props = {
  profile: PlaceProfile;
  className?: string;
};

function externalHref(uri: string): string {
  const trimmed = uri.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function PlaceLinksPanel({ profile, className }: Props) {
  const websiteUri = profile.website_uri?.trim();
  const showWeb = profile.website_type !== "none" && Boolean(websiteUri);
  const webLabel = websiteUri && isPowerUpMenuUri(websiteUri) ? "Tu carta PowerUp" : "Web";

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm shadow-sm",
        className,
      )}
    >
      {showWeb && websiteUri ? (
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {webLabel}
          </span>
          <p className="mt-1 break-all">
            <a
              href={externalHref(websiteUri)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {websiteUri}
            </a>
          </p>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Google no tiene una web registrada para este local.
        </p>
      )}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Google Maps
        </span>
        <p className="mt-1 break-all">
          {profile.google_maps_uri ? (
            <a
              href={profile.google_maps_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Ver en Maps
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
      </div>
    </div>
  );
}
