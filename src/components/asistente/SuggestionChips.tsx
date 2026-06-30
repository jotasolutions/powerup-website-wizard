import { useEffect, useRef, type PointerEvent } from "react";
import { ChevronRight, Loader2, MapPin } from "lucide-react";
import { ALTA_SUGGESTIONS_HINT_CHAT, ALTA_SUGGESTIONS_TITLE } from "@/lib/alta-copy";
import { cn } from "@/lib/utils";

export type SuggestionChipItem = {
  id: string;
  primary: string;
  secondary?: string;
};

const TAP_MOVE_THRESHOLD_PX = 10;

type Props = {
  listId: string;
  items: SuggestionChipItem[];
  loading?: boolean;
  error?: string | null;
  onSelect: (id: string) => void;
  className?: string;
  /** Altura máxima del listado scrollable (px); útil en footer con teclado móvil */
  maxHeight?: number;
  /** Cierra el teclado al desplazar o tocar la zona de sugerencias (móvil) */
  onDismissKeyboard?: () => void;
  /** Sin marco propio; el padre aporta el contenedor (combobox unificado) */
  attached?: boolean;
  /** footer = listado pegado encima del input; anchored = panel flotante GMB; chat = burbujas en el hilo */
  variant?: "footer" | "anchored" | "chat";
};

/** Sugerencias pulsables (listado encima del input o en el chat). */
export function SuggestionChips({
  listId,
  items,
  loading = false,
  error = null,
  onSelect,
  className,
  maxHeight,
  onDismissKeyboard,
  attached = false,
  variant = "footer",
}: Props) {
  const dismissedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, moved: false, pointerId: -1 });

  useEffect(() => {
    dismissedRef.current = false;
  }, [items, loading]);

  if (!loading && !error && items.length === 0) return null;

  const isFooter = variant === "footer";
  const isAnchored = variant === "anchored";
  const isPanel = isFooter || isAnchored;
  const anchoredHeaderHeight = attached ? 44 : 52;
  const scrollMaxHeight =
    isAnchored && maxHeight != null
      ? Math.max(80, maxHeight - anchoredHeaderHeight)
      : maxHeight;

  function maybeDismissKeyboard() {
    if (dismissedRef.current || !onDismissKeyboard) return;
    dismissedRef.current = true;
    onDismissKeyboard();
  }

  function handleListPointerDown(e: PointerEvent<HTMLDivElement>) {
    pointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
  }

  function handleListPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== pointerRef.current.pointerId) return;
    const dx = Math.abs(e.clientX - pointerRef.current.x);
    const dy = Math.abs(e.clientY - pointerRef.current.y);
    if (dx > TAP_MOVE_THRESHOLD_PX || dy > TAP_MOVE_THRESHOLD_PX) {
      pointerRef.current.moved = true;
      maybeDismissKeyboard();
    }
  }

  function handleItemPointerUp(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (e.pointerId !== pointerRef.current.pointerId) return;
    if (pointerRef.current.moved) return;
    e.preventDefault();
    onSelect(id);
  }

  const hintText = isAnchored
    ? attached
      ? "Desliza para ver más resultados"
      : "Desliza para ver más · toca para elegir"
    : isFooter
      ? "Toca un resultado para seleccionarlo"
      : ALTA_SUGGESTIONS_HINT_CHAT;

  const scrollList = (
    <div
      className={cn(
        "overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]",
        isPanel && !isAnchored && "space-y-1.5",
        isAnchored && !attached && "space-y-2 px-2 py-2",
        isFooter && scrollMaxHeight == null && "max-h-[min(40dvh,240px)]",
        !isPanel && "max-h-[min(50dvh,360px)] space-y-1.5",
      )}
      style={isPanel && scrollMaxHeight != null ? { maxHeight: scrollMaxHeight } : undefined}
      onPointerDown={handleListPointerDown}
      onPointerMove={handleListPointerMove}
      onScroll={() => maybeDismissKeyboard()}
    >
      {loading && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isPanel ? (isAnchored ? "px-1 py-2" : "px-1 py-2") : "rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 shadow-bubble",
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
            isPanel ? "px-1 py-1" : "rounded-2xl rounded-tl-md bg-destructive/10 px-4 py-2.5",
          )}
        >
          {error}
        </p>
      )}
      {items.length > 0 && (
        <>
          {!isAnchored && (
            <p
              className={cn(
                "font-medium text-muted-foreground",
                isFooter ? "px-1 text-[11px]" : "px-1 text-xs",
              )}
            >
              {hintText}
            </p>
          )}
          <ul id={listId} role="listbox" className={cn(!isAnchored && "space-y-1.5")}>
            {items.map((item, index) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  onPointerUp={(e) => handleItemPointerUp(e, item.id)}
                  className={cn(
                    "w-full text-left transition touch-manipulation",
                    isAnchored
                      ? cn(
                          "flex items-start gap-3 px-4 py-3.5 active:bg-muted/70",
                          index > 0 && "border-t border-border/45",
                        )
                      : cn(
                          "rounded-xl border border-border/60 bg-card px-3 py-3 shadow-sm",
                          "hover:border-primary/40 hover:bg-accent active:scale-[0.99]",
                          isFooter && "border-primary/20",
                        ),
                  )}
                >
                  {isAnchored && (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand/80" aria-hidden />
                  )}
                  <span className={cn("min-w-0", isAnchored && "flex-1")}>
                    <span className="block text-sm font-medium leading-snug">{item.primary}</span>
                    {item.secondary ? (
                      <span className="mt-0.5 block min-w-0 break-words text-xs leading-relaxed text-muted-foreground">
                        {item.secondary}
                      </span>
                    ) : null}
                  </span>
                  {isAnchored && (
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/45"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  const anchoredHeader = (
    <div
      className={cn(
        "border-b border-border/45 px-4 py-2.5",
        attached ? "bg-bubble-bot" : "bg-muted/30",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-sm font-medium tracking-tight">{ALTA_SUGGESTIONS_TITLE}</p>
        {items.length > 0 && !loading && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {items.length}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hintText}</p>
    </div>
  );

  const anchoredBody = (
    <>
      {anchoredHeader}
      <div className="relative">
        {scrollList}
        {items.length > 2 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bubble-bot to-transparent"
            aria-hidden
          />
        )}
      </div>
    </>
  );

  const list = isAnchored ? (
    attached ? (
      <div className={className}>{anchoredBody}</div>
    ) : (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/70 bg-white shadow-card ring-1 ring-black/[0.04]",
          className,
        )}
      >
        {anchoredBody}
      </div>
    )
  ) : (
    scrollList
  );

  if (isFooter) {
    return <div className={cn("mb-2", className)}>{list}</div>;
  }

  if (isAnchored) {
    return list;
  }

  return (
    <div className={cn("flex animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>
      <div className="w-9 shrink-0" aria-hidden />
      <div className="min-w-0 max-w-[85%] flex-1">{list}</div>
    </div>
  );
}
