# PowerUp Website Wizard

Asistente de alta de páginas web para restaurantes (PowerUp Menu). Stack: **TanStack Start** + **Vite** + **Nitro** (preset `vercel`), **Neon** (Drizzle ORM), **Stripe Checkout**, **Tailwind v4** + shadcn/ui.

## Desarrollo local

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL, STRIPE_*, APP_URL
npm run db:push        # aplicar schema en Neon
npm run dev            # http://localhost:8080
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Neon Postgres (obligatorio) |
| `STRIPE_SECRET_KEY` | Checkout Stripe (obligatorio) |
| `STRIPE_PRICE_PRO_ANUAL` | Price ID del plan anual (obligatorio) |
| `GOOGLE_PLACES_API_KEY` | Google Places API (New) para búsqueda de restaurantes (obligatorio en **Production**) |
| `APP_URL` | URL pública para success/cancel de Stripe (opcional en local; el cliente envía `window.location.origin`) |

La comprobación de dominios personalizados sigue en **mock** (`MOCK_DOMAIN_CHECK` en `alta-config.ts`) hasta integrar un registrador.

Tras añadir o cambiar variables en Vercel, **redeploy de Production** para que el serverless las reciba. La API key de Google debe ser de **servidor** (sin restricción HTTP referrer).

## Flujo principal

1. UI: `src/components/asistente/AsistenteAlta.tsx`
2. Server fn: `src/lib/alta.functions.ts` → `startCheckout` (insert Neon + sesión Stripe)
3. Confirmación: `src/routes/confirmacion.tsx` → `finalizeCheckout`

## Convenciones

- Server-only: archivos `*.server.ts` y `src/db/index.server.ts`
- No commitear `.env` ni secretos
- Mantener el preset Nitro `vercel` en `vite.config.ts` — el deploy lo gestiona Vercel directamente desde GitHub
