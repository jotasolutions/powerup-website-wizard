import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useVisualViewport } from "@/hooks/useKeyboardInset";

type Props = {
  children: ReactNode;
  suggestions?: ReactNode;
  suggestionsOpen?: boolean;
  className?: string;
};

/** Input en footer con sugerencias que crecen hacia arriba (drop-up) para no tapar el teclado. */
export function KeyboardAwareField({
  children,
  suggestions,
  suggestionsOpen = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(224);
  const { viewportHeight } = useVisualViewport();

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const vv = window.visualViewport;
    const vvHeight = vv?.height ?? viewportHeight;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top - vvOffsetTop - 8;
    const cap = Math.round(vvHeight * 0.4);
    setMaxHeight(Math.max(80, Math.min(cap, spaceAbove)));
  }, [viewportHeight]);

  useLayoutEffect(() => {
    if (!suggestionsOpen) return;

    measure();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [suggestionsOpen, measure]);

  function handleFocusIn(e: React.FocusEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      measure();
      requestAnimationFrame(measure);
      window.setTimeout(measure, 100);
      window.setTimeout(measure, 300);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)} onFocusIn={handleFocusIn}>
      {suggestionsOpen && suggestions ? (
        <div
          className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-y-auto overscroll-contain rounded-xl border bg-card shadow-card"
          style={{ maxHeight }}
        >
          {suggestions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
