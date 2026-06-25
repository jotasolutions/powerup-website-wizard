function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return normalizeEnvValue(value);
  }
  return undefined;
}

function normalizeEnvValue(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim().replace(/^["']|["']$/g, "");

  if (url.startsWith("postgres://")) {
    url = `postgresql://${url.slice("postgres://".length)}`;
  }

  if (!url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL debe ser un connection string de Neon con formato postgresql://user:password@host/dbname?...",
    );
  }

  return url;
}

/** Connection string de Neon/Postgres (Vercel y local usan nombres distintos). */
export function getDatabaseUrl(): string {
  const url = firstEnv(
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
    "NEON_DATABASE_URL",
    "NEON_POSTGRES_URL",
  );

  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Añádela en Vercel → Environment Variables (o en tu .env local).",
    );
  }

  return normalizeDatabaseUrl(url);
}

export function getStripeSecretKey(): string | undefined {
  return firstEnv("STRIPE_SECRET_KEY", "STRIPE_API_KEY");
}

export function getStripeAnnualPriceId(): string | undefined {
  return firstEnv("STRIPE_PRICE_PRO_ANUAL", "STRIPE_PRICE_PRO_YEARLY");
}

export function hasDatabaseUrl(): boolean {
  try {
    getDatabaseUrl();
    return true;
  } catch {
    return false;
  }
}

export function hasStripeConfig(): boolean {
  return Boolean(getStripeSecretKey() && getStripeAnnualPriceId());
}

export function getGooglePlacesApiKey(): string | undefined {
  return firstEnv(
    "GOOGLE_PLACES_API_KEY",
    "GOOGLE_API_KEY",
    "NEXT_PUBLIC_GOOGLE_API_KEY",
    "VITE_GOOGLE_API_KEY",
  );
}

export function hasGooglePlaces(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

export function getEvolutionApiUrl(): string {
  const url = firstEnv("EVOLUTION_API_URL");
  if (!url) {
    throw new Error(
      "Falta EVOLUTION_API_URL. Añádela en Vercel → Environment Variables (o en tu .env local).",
    );
  }
  return url.replace(/\/$/, "");
}

export function getEvolutionInstanceName(): string {
  const name = firstEnv("EVOLUTION_INSTANCE_NAME");
  if (!name) {
    throw new Error(
      "Falta EVOLUTION_INSTANCE_NAME. Añádela en Vercel → Environment Variables (o en tu .env local).",
    );
  }
  return name;
}

export function getEvolutionApiKey(): string | undefined {
  return firstEnv("EVOLUTION_API_KEY");
}

export function hasEvolutionConfig(): boolean {
  try {
    getEvolutionApiUrl();
    getEvolutionInstanceName();
    return true;
  } catch {
    return false;
  }
}
