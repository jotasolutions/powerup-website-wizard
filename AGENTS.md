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
| `NAMECHEAP_API_USER` | Usuario API de Namecheap (obligatorio si `MOCK_DOMAIN_CHECK=false`) |
| `NAMECHEAP_API_KEY` | API key de Namecheap (obligatorio si `MOCK_DOMAIN_CHECK=false`) |
| `NAMECHEAP_CLIENT_IP` | IPv4 autorizada en Namecheap API Access (obligatorio si `MOCK_DOMAIN_CHECK=false`) |
| `NAMECHEAP_SANDBOX` | `true` para usar `api.sandbox.namecheap.com` |
| `NAMECHEAP_DOMAIN_MARGIN_PERCENT` | Margen porcentual aplicado al precio base del dominio (default: `20`) |
| `NAMECHEAP_USD_TO_EUR` | Cambio fijo USD→EUR usado cuando Namecheap no devuelve EUR (default: `0.92`) |

Para activar comprobación real de dominios con Namecheap, configura `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY` y `NAMECHEAP_CLIENT_IP` (IP autorizada en Namecheap → Profile → Tools → API Access). Con credenciales completas se usa Namecheap automáticamente; pon `MOCK_DOMAIN_CHECK=true` para forzar mock en local.

Tras añadir o cambiar variables en Vercel, **redeploy de Production** para que el serverless las reciba. La API key de Google debe ser de **servidor** (sin restricción HTTP referrer).

## Flujo principal

1. UI: `src/components/asistente/AsistenteAlta.tsx`
2. Server fn: `src/lib/alta.functions.ts` → `startCheckout` (insert Neon + sesión Stripe)
3. Confirmación: `src/routes/confirmacion.tsx` → `finalizeCheckout`

## Convenciones

- Server-only: archivos `*.server.ts` y `src/db/index.server.ts`
- No commitear `.env` ni secretos
- Mantener el preset Nitro `vercel` en `vite.config.ts` — el deploy lo gestiona Vercel directamente desde GitHub
