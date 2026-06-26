import { useEffect, useRef, useState } from "react";

const KEYBOARD_OPEN_THRESHOLD = 50;

export type VisualViewportState = {
  keyboardInset: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  isKeyboardOpen: boolean;
};

function readVisualViewport(baselineHeight: number): VisualViewportState {
  if (typeof window === "undefined") {
    return { keyboardInset: 0, viewportHeight: 0, viewportOffsetTop: 0, isKeyboardOpen: false };
  }

  const vv = window.visualViewport;
  if (!vv) {
    return {
      keyboardInset: 0,
      viewportHeight: window.innerHeight,
      viewportOffsetTop: 0,
      isKeyboardOpen: false,
    };
  }

  const viewportHeight = Math.round(vv.height);
  const viewportOffsetTop = Math.round(vv.offsetTop);
  const classicInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  const baselineInset = Math.max(0, Math.round(baselineHeight - vv.height - vv.offsetTop));
  const keyboardInset = Math.max(classicInset, baselineInset);

  return {
    keyboardInset,
    viewportHeight,
    viewportOffsetTop,
    isKeyboardOpen: keyboardInset > KEYBOARD_OPEN_THRESHOLD,
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
  const baselineRef = useRef(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  const [state, setState] = useState(() => readVisualViewport(baselineRef.current));

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const next = readVisualViewport(baselineRef.current);
      if (next.keyboardInset < KEYBOARD_OPEN_THRESHOLD) {
        baselineRef.current = Math.max(
          baselineRef.current,
          window.innerHeight,
          next.viewportHeight + next.viewportOffsetTop,
        );
      }
      setState(next);
      applyViewportCssVars(next);
    }

    function scheduleRemeasure() {
      update();
      requestAnimationFrame(update);
      window.setTimeout(update, 100);
      window.setTimeout(update, 300);
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        scheduleRemeasure();
      }
    }

    function onOrientationChange() {
      window.setTimeout(() => {
        baselineRef.current = window.innerHeight;
        update();
      }, 100);
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusIn);
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
