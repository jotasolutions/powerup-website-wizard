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
| `APP_URL` | URL pública para success/cancel de Stripe (opcional en local; el cliente envía `window.location.origin`) |

## Flujo principal

1. UI: `src/components/asistente/AsistenteAlta.tsx`
2. Server fn: `src/lib/alta.functions.ts` → `startCheckout` (insert Neon + sesión Stripe)
3. Confirmación: `src/routes/confirmacion.tsx` → `finalizeCheckout`

### Prefetch de dominio (etapa 6)

- Al fijar `restaurant_name` (pick GMB o alta manual), `useDomainPrefetch` dispara `checkDomain` para `{slug}.es` en paralelo al enrichment.
- El resultado vive en React Query con clave `["domain-prefetch", candidateDomain]`; no duplicar en `AltaState`.
- Si el `.es` exacto no está libre, se promueve la primera alternativa de Namecheap como sugerencia lista en `elegirDominio`.
- `has_existing_website` no se deriva de `place_profile` — desacoplado a propósito para el fee de gestión.

### `resolveBusinessTerm` — no usar para afirmar tipo en copy

`resolveBusinessTerm` (`src/lib/business-type.ts`) sigue calculándose en enrichment (`place_profile.business_term`) por si hace falta en analytics o lógica futura, pero **no interpolar en textos al usuario**: Google mete `bar` / `cocktail_bar` en `types[]` de muchos restaurantes (p. ej. Voltereta Manhattan → `business_term === "bar"` con `primaryTypeDisplayName` «Restaurante de fusión»).

**Copy neutro (no depende de `business_term`):** `formatConfirmInfoPrompt`, `formatEncontradoBotPrompt`, `formatEncontradoLoadingLabel`, `formatOrderDetailLabel`, `formatSupportBusinessLabel`. La data card muestra `cuisine_label`, no `business_term`. La enumeración genérica «restaurante, bar o cafetería» en welcome/placeholder es intencional.

## Convenciones

- Server-only: archivos `*.server.ts` y `src/db/index.server.ts`
- No commitear `.env` ni secretos
- Mantener el preset Nitro `vercel` en `vite.config.ts` — el deploy lo gestiona Vercel directamente desde GitHub
