import { getRequest } from "@tanstack/react-start/server";

/** IP del cliente desde headers de proxy (Vercel / Nitro). */
export function getClientIpFromRequest(): string | null {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    return null;
  } catch {
    return null;
  }
}
