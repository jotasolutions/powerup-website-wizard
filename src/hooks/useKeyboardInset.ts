import { useEffect, useState, type RefObject } from "react";

export const KEYBOARD_OPEN_THRESHOLD = 50;

const SSR_SAFE_STATE: VisualViewportState = {
  keyboardInset: 0,
  viewportHeight: 0,
  viewportOffsetTop: 0,
  isKeyboardOpen: false,
};

export type VisualViewportState = {
  keyboardInset: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  isKeyboardOpen: boolean;
};

function readVisualViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return SSR_SAFE_STATE;
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
  const keyboardInset = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop),
  );

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
  root.style.setProperty("--keyboard-inset-height", `${state.keyboardInset}px`);
  root.style.setProperty("--vv-height", `${state.viewportHeight}px`);
  root.style.setProperty("--vv-offset-top", `${state.viewportOffsetTop}px`);
}

function clearViewportCssVars() {
  const root = document.documentElement;
  root.style.removeProperty("--keyboard-inset");
  root.style.removeProperty("--keyboard-inset-height");
  root.style.removeProperty("--vv-height");
  root.style.removeProperty("--vv-offset-top");
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/** Estado del visualViewport: teclado, altura visible y offset (iOS). SSR-safe. */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(SSR_SAFE_STATE);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setState(readVisualViewport());
      return;
    }

    // Alineado con viewport meta `interactive-widget=resizes-content`: el teclado
    // reduce el viewport visible en lugar de taparlo (Chrome Android 13+, iOS 17+).
    if ("virtualKeyboard" in navigator) {
      try {
        (navigator as Navigator & { virtualKeyboard: { overlaysContent: boolean } }).virtualKeyboard.overlaysContent =
          false;
      } catch {
        // Progressive enhancement — no-op en navegadores sin soporte.
      }
    }

    function update() {
      const next = readVisualViewport();
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
      window.setTimeout(update, 100);
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

/** Altura del teclado virtual (px) vía visualViewport. */
export function useKeyboardInset(): number {
  return useVisualViewport().keyboardInset;
}

/** Altura de un elemento medida con ResizeObserver (px). */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setHeight(0);
      return;
    }

    function update() {
      if (ref.current) {
        setHeight(Math.round(ref.current.getBoundingClientRect().height));
      }
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  });

  return height;
}

function isInputVisibleInViewport(element: HTMLElement, padding = 12): boolean {
  const vv = window.visualViewport;
  if (!vv) return true;

  const rect = element.getBoundingClientRect();
  const visibleTop = vv.offsetTop + padding;
  const visibleBottom = vv.height + vv.offsetTop - padding;
  return rect.top >= visibleTop && rect.bottom <= visibleBottom;
}

function scrollInputIntoViewOnce(element: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) {
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return;
  }

  if (isInputVisibleInViewport(element)) return;

  const inFooter = element.closest("footer") != null;
  if (inFooter) {
    element.scrollIntoView({ block: "end", behavior: "smooth" });
    return;
  }

  const scrollParent = findScrollParent(element);
  if (!scrollParent) {
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return;
  }

  const rect = element.getBoundingClientRect();
  const visibleBottom = vv.height + vv.offsetTop;
  const padding = 12;

  if (rect.bottom > visibleBottom - padding) {
    scrollParent.scrollTop += rect.bottom - (visibleBottom - padding);
  } else if (rect.top < vv.offsetTop + padding) {
    scrollParent.scrollTop += rect.top - (vv.offsetTop + padding);
  }
}

/** Mantiene un input dentro del visualViewport (reintenta tras la animación del teclado en Android). */
export function scrollInputIntoView(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return;

  for (const delay of [0, 100, 300]) {
    window.setTimeout(() => scrollInputIntoViewOnce(element), delay);
  }
}
