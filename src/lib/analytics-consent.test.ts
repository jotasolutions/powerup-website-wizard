import { describe, expect, it } from "vitest";
import {
  ALL_ACCEPTED,
  ALL_REJECTED,
  CONSENT_VERSION,
  decideAnalytics,
  readConsent,
  serializeConsentCookie,
} from "./analytics-consent";

// Tal como la escribe www.powerup.menu (components/cookie-consent/utils.ts): rechazo total.
const WEB_REJECTED_COOKIE =
  "pu_consent=%7B%22v%22%3A%221.0.0%22%2C%22a%22%3A0%2C%22m%22%3A0%2C%22p%22%3A0%2C%22t%22%3A1790684917602%7D";

function cookieValue(serialized: string): string {
  return serialized.split(";")[0];
}

describe("readConsent", () => {
  it("lee la cookie tal como la escribe la web", () => {
    expect(readConsent(`_ga=GA1.1.1; ${WEB_REJECTED_COOKIE}; other=1`)).toEqual(ALL_REJECTED);
  });

  it("devuelve null sin cookie, con cookie rota o con otra versión del aviso", () => {
    expect(readConsent("")).toBeNull();
    expect(readConsent("pu_consent=no-json")).toBeNull();
    expect(readConsent('pu_consent={"v":"1.0.0","a":2,"m":0,"p":0,"t":1}')).toBeNull();

    const otherVersion = encodeURIComponent(JSON.stringify({ v: "0.9.0", a: 1, m: 1, p: 1, t: 1 }));
    expect(readConsent(`pu_consent=${otherVersion}`)).toBeNull();
  });

  it("lee lo que escribe el propio wizard", () => {
    const serialized = serializeConsentCookie(
      { analytics: true, marketing: false, preferences: true },
      { hostname: "alta-pagina-web.powerup.menu", protocol: "https:" },
    );
    expect(readConsent(cookieValue(serialized))).toEqual({
      analytics: true,
      marketing: false,
      preferences: true,
    });
  });
});

describe("serializeConsentCookie", () => {
  it("en *.powerup.menu la comparte con la web (Domain=powerup.menu) y exige https", () => {
    const serialized = serializeConsentCookie(ALL_ACCEPTED, {
      hostname: "alta-pagina-web.powerup.menu",
      protocol: "https:",
    });
    expect(serialized).toContain("Domain=powerup.menu");
    expect(serialized).toContain("Secure");
    expect(serialized).toContain("SameSite=Lax");
    expect(serialized).toContain("Path=/");
  });

  it("fuera de powerup.menu queda solo en ese dominio", () => {
    for (const hostname of ["localhost", "powerup-website-wizard-xi.vercel.app"]) {
      const serialized = serializeConsentCookie(ALL_REJECTED, { hostname, protocol: "http:" });
      expect(serialized).not.toContain("Domain=");
      expect(serialized).not.toContain("Secure");
    }
  });

  it("guarda la versión del aviso y la fecha", () => {
    const serialized = serializeConsentCookie(
      ALL_REJECTED,
      { hostname: "localhost", protocol: "http:" },
      1_700_000_000_000,
    );
    const value = JSON.parse(decodeURIComponent(cookieValue(serialized).split("=")[1]));
    expect(value).toEqual({ v: CONSENT_VERSION, a: 0, m: 0, p: 0, t: 1_700_000_000_000 });
  });
});

describe("decideAnalytics", () => {
  const base = { token: "phc_x", pathname: "/", consent: null, isDev: false };

  it("sin clave no mide ni pregunta", () => {
    expect(decideAnalytics({ ...base, token: "" })).toBe("off");
  });

  it("el panel interno nunca se mide", () => {
    expect(decideAnalytics({ ...base, pathname: "/panel/m4x8nq2k", consent: ALL_ACCEPTED })).toBe(
      "off",
    );
  });

  it("respeta la elección hecha en la web o en el wizard", () => {
    expect(decideAnalytics({ ...base, consent: ALL_ACCEPTED })).toBe("on");
    expect(decideAnalytics({ ...base, consent: ALL_REJECTED })).toBe("off");
    expect(
      decideAnalytics({
        ...base,
        consent: { analytics: false, marketing: true, preferences: true },
      }),
    ).toBe("off");
  });

  it("sin elección enseña el aviso; en desarrollo local mide como siempre", () => {
    expect(decideAnalytics(base)).toBe("ask");
    expect(decideAnalytics({ ...base, isDev: true })).toBe("on");
    expect(decideAnalytics({ ...base, isDev: true, consent: ALL_REJECTED })).toBe("off");
  });
});
