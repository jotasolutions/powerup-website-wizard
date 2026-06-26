import { useEffect, useState } from "react";

export type VisualViewportState = {
  keyboardInset: number;
  viewportHeight: number;
  viewportOffsetTop: number;
};

function readVisualViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return { keyboardInset: 0, viewportHeight: 0, viewportOffsetTop: 0 };
  }

  const vv = window.visualViewport;
  if (!vv) {
    return {
      keyboardInset: 0,
      viewportHeight: window.innerHeight,
      viewportOffsetTop: 0,
    };
  }

  return {
    keyboardInset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
    viewportHeight: Math.round(vv.height),
    viewportOffsetTop: Math.round(vv.offsetTop),
  };
}

function applyViewportCssVars(state: VisualViewportState) {
  const root = document.documentElement;
  root.style.setProperty("--keyboard-inset", `${state.keyboardInset}px`);
  root.style.setProperty("--vv-height", `${state.viewportHeight}px`);
  root.style.setProperty("--vv-offset-top", `${state.viewportOffsetTop}px`);
}

function clearViewportCssVars() {
  const root = document.documentElement;
  root.style.removeProperty("--keyboard-inset");
  root.style.removeProperty("--vv-height");
  root.style.removeProperty("--vv-offset-top");
}

/** Estado del visualViewport: teclado, altura visible y offset (iOS). */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState(readVisualViewport);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const next = readVisualViewport();
      setState(next);
      applyViewportCssVars(next);
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      clearViewportCssVars();
    };
  }, []);

  return state;
}

/** Altura del teclado virtual (px) vía visualViewport — útil en iOS/Android. */
export function useKeyboardInset(): number {
  return useVisualViewport().keyboardInset;
}

export function scrollInputIntoView(element: HTMLElement | null) {
  if (!element) return;
  window.setTimeout(() => {
    const vv = window.visualViewport;
    if (!vv) {
      element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    const rect = element.getBoundingClientRect();
    const visibleBottom = vv.height + vv.offsetTop;
    const padding = 12;

    if (rect.bottom > visibleBottom - padding) {
      const scrollY = rect.bottom - (visibleBottom - padding);
      window.scrollBy({ top: scrollY, behavior: "smooth" });
    } else if (rect.top < vv.offsetTop + padding) {
      const scrollY = rect.top - (vv.offsetTop + padding);
      window.scrollBy({ top: scrollY, behavior: "smooth" });
    }
  }, 120);
}
