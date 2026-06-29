import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SuggestionChipItem = {
  id: string;
  primary: string;
  secondary?: string;
};

type Props = {
  listId: string;
  items: SuggestionChipItem[];
  loading?: boolean;
  error?: string | null;
  onSelect: (id: string) => void;
  className?: string;
  /** footer = listado pegado encima del input; chat = burbujas en el hilo */
  variant?: "footer" | "chat";
};

/** Sugerencias pulsables (listado encima del input o en el chat). */
export function SuggestionChips({
  listId,
  items,
  loading = false,
  error = null,
  onSelect,
  className,
  variant = "footer",
}: Props) {
  if (!loading && !error && items.length === 0) return null;

  const isFooter = variant === "footer";

  const list = (
    <div className={cn("space-y-1.5", isFooter && "max-h-[min(40dvh,240px)] overflow-y-auto overscroll-contain")}>
      {loading && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isFooter ? "px-1 py-2" : "rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 shadow-bubble",
          )}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando…
        </div>
      )}
      {error && (
        <p
          className={cn(
            "text-xs text-destructive",
            isFooter ? "px-1 py-1" : "rounded-2xl rounded-tl-md bg-destructive/10 px-4 py-2.5",
          )}
        >
          {error}
        </p>
      )}
      {items.length > 0 && (
        <>
          {isFooter && (
            <p className="px-1 text-[11px] font-medium text-muted-foreground">
              Toca un resultado para seleccionarlo
            </p>
          )}
          <ul id={listId} role="listbox" className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    // Evita que el blur del input cierre el teclado antes del tap (iOS).
                    e.preventDefault();
                    onSelect(item.id);
                  }}
                  className={cn(
                    "w-full rounded-xl border border-border/60 bg-card px-3 py-3 text-left shadow-sm transition touch-manipulation",
                    "hover:border-primary/40 hover:bg-accent active:scale-[0.99]",
                    isFooter && "border-primary/20",
                  )}
                >
                  <span className="block text-sm font-medium">{item.primary}</span>
                  {item.secondary ? (
                    <span className="mt-0.5 block min-w-0 break-words text-xs text-muted-foreground">
                      {item.secondary}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  if (isFooter) {
    return <div className={cn("mb-2", className)}>{list}</div>;
  }

  return (
    <div className={cn("flex animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>
      <div className="w-9 shrink-0" aria-hidden />
      <div className="min-w-0 max-w-[85%] flex-1">{list}</div>
    </div>
  );
}
