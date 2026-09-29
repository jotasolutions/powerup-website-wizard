import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_ACCEPTED,
  ALL_REJECTED,
  decideAnalytics,
  readConsent,
  serializeConsentCookie,
  type ConsentCategories,
} from "@/lib/analytics-consent";
import {
  getClientPostHogToken,
  isPostHogActive,
  startPostHog,
  stopPostHog,
} from "@/lib/posthog-client";

type ConsentContextValue = {
  /** Hay PostHog que medir: tienen sentido el aviso y el enlace «Cookies». */
  enabled: boolean;
  /** PostHog está capturando en esta página. */
  analyticsActive: boolean;
  /** Elección vigente (web o wizard), o null si todavía no hay. */
  categories: ConsentCategories | null;
  bannerOpen: boolean;
  settingsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (categories: ConsentCategories) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [analyticsActive, setAnalyticsActive] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const token = getClientPostHogToken();
    const consent = readConsent(document.cookie);
    const decision = decideAnalytics({
      token,
      pathname: window.location.pathname,
      consent,
      isDev: import.meta.env.DEV,
    });

    if (decision === "on") startPostHog();
    setEnabled(Boolean(token));
    setCategories(consent);
    setBannerOpen(decision === "ask");
    setAnalyticsActive(isPostHogActive());
  }, []);

  const save = useCallback((next: ConsentCategories) => {
    document.cookie = serializeConsentCookie(next, window.location);
    if (next.analytics) startPostHog();
    else stopPostHog();

    setCategories(next);
    setBannerOpen(false);
    setSettingsOpen(false);
    setAnalyticsActive(isPostHogActive());
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      enabled,
      analyticsActive,
      categories,
      bannerOpen,
      settingsOpen,
      acceptAll: () => save(ALL_ACCEPTED),
      rejectAll: () => save(ALL_REJECTED),
      save,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [enabled, analyticsActive, categories, bannerOpen, settingsOpen, save],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useConsent must be used within a ConsentProvider");
  return context;
}
