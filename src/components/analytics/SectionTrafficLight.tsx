import type { SectionLights } from "@/lib/analytics-dashboard.functions";
import { cn } from "@/lib/utils";

const LIGHT_STYLES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  gray: "bg-muted-foreground/40",
} as const;

export function SectionTrafficLight({
  title,
  light,
  subtitle,
}: {
  title: string;
  light: SectionLights["funciona"]["light"];
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <span
        className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", LIGHT_STYLES[light])}
        aria-hidden
      />
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">— {subtitle}</p>
      </div>
    </div>
  );
}
