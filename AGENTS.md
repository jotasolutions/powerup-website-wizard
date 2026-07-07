# PowerUp Website Wizard

Asistente de alta de páginas web para restaurantes (PowerUp Menu). Stack: **TanStack Start** + **Vite** + **Nitro** (preset `vercel`), **Neon** (Drizzle ORM), **Stripe Checkout**, **Tailwind v4** + shadcn/ui.

## Validación local (criterio del equipo)

```bash
npm install
cp .env.example .env   # completar variables (ver .env.example)
npm run db:push        # aplicar schema en Neon (obligatorio tras cambios en src/db/schema.ts)
npm run dev            # http://localhost:8080
```

Pruebas desde móvil en la misma Wi‑Fi: `npm run dev:mobile` → `http://<IP-LAN>:8080`.

Si `saveAlta` falla con `Failed query: insert into "altas"`, el esquema de Neon está desactualizado: vuelve a ejecutar `npm run db:push` (en CI o sin TTY usa `npm run db:push -- --force`).

El deploy en Vercel puede quedar sin env vars a propósito; **no** es criterio de validación ni se tratan sus errores como bugs. Checklist completo de despliegue: **[DEPLOY.md](DEPLOY.md)**.

## Variables de entorno (desarrollo local)

Plantilla completa: `.env.example`. Resumen de las más usadas en local:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Neon Postgres (o alias `POSTGRES_URL`, etc.; ver `getDatabaseUrl()` en `env.server.ts`) |
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog cliente (`posthog-js`) y servidor (`posthog-node` en webhook) |
| `VITE_PUBLIC_POSTHOG_HOST` | Host EU de ingestión (`https://eu.i.posthog.com`) |
| `STRIPE_SECRET_KEY` | Checkout Stripe |
| `STRIPE_PRICE_PRO_ANUAL` | Price ID del plan anual |
| `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint webhook (`whsec_…`); local: `stripe listen --forward-to localhost:8080/api/stripe/webhook` |
| `APP_URL` | Opcional en local; el cliente envía `window.location.origin` |
| `GOOGLE_PLACES_API_KEY` | Búsqueda de restaurantes |
| `POSTHOG_PERSONAL_API_KEY` | Panel interno `/panel/{slug}` — HogQL (solo si usas el panel en local) |

El cliente PostHog usa `api_host: /ingest`. En local, Nitro `routeRules` hace proxy hacia PostHog EU. En deploy, `vercel.json` reescribe `/ingest/*` (ver [DEPLOY.md](DEPLOY.md)).

## PostHog (proyecto canónico)

- **Proyecto EU:** [212884](https://eu.posthog.com/project/212884/) — única fuente de verdad para eventos del wizard.
- **Dashboard:** [792288](https://eu.posthog.com/project/212884/dashboard/792288) (creado por el wizard).
- **No usar** el proyecto US `491194` (`us.posthog.com`) — quedó del warehouse wizard por error.
- **Token:** el mismo `phc_*` del proyecto 212884 en `.env` local.

### Panel interno Diagnóstico Alta

- Ruta local: `http://localhost:8080/panel/m4x8nq2k` (slug por defecto).
- Spec métricas: `posthog-dashboard-diagnostico-alta.md`.
- Variables y auth en producción: [DEPLOY.md](DEPLOY.md).

## Flujo principal

1. UI: `src/components/asistente/AsistenteAlta.tsx`
2. Server fn: `src/lib/alta.functions.ts` → `saveAlta` + `createCheckout` (UI); fulfillment `paid` vía webhook `POST /api/stripe/webhook`
3. Confirmación: `src/routes/confirmacion.tsx` → `finalizeCheckout` (UX idempotente; autoridad en webhook)

### Notificaciones Slack

Con `SLACK_WEBHOOK_URL` en `.env` local, el servidor envía dos mensajes por alta completa:

1. **Lead** — al guardar WhatsApp en `saveAlta` (pendiente de pago).
2. **Alta pagada** — al confirmar el pago (`stripe_webhook`, `finalize_checkout` o `mock_checkout` en local sin Stripe).

Si el usuario abandona antes de pagar, solo llega el mensaje de lead. Los avisos son fire-and-forget.

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
- Mantener el preset Nitro `vercel` en `vite.config.ts` — el deploy lo gestiona el host desde GitHub
- **Despliegue a producción:** [DEPLOY.md](DEPLOY.md) (único checklist; responsabilidad del deploy owner)
