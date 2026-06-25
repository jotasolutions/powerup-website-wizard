function parseSecretKeys(raw?: string): string | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0];
  } catch {
    return raw.startsWith("sb_secret_") || raw.startsWith("eyJ") ? raw : undefined;
  }
}

export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error("Falta SUPABASE_URL.");
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error("Falta SUPABASE_PUBLISHABLE_KEY.");
  }

  return key;
}

/** Lovable Cloud inyecta la secret key en el backend (varios nombres posibles). */
export function getSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    parseSecretKeys(process.env.SUPABASE_SECRET_KEYS)
  );
}

export function getAppOrigin(): string {
  const explicit =
    process.env.APP_URL ??
    process.env.PUBLIC_URL ??
    process.env.VITE_APP_URL ??
    process.env.LOVABLE_PREVIEW_URL;

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const port = process.env.PORT ?? process.env.VITE_PORT ?? "8080";
  return `http://localhost:${port}`;
}
