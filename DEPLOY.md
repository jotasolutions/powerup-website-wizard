# Despliegue a producción

## Política local-first

El criterio de “funciona” del equipo de desarrollo es **solo local**: `npm run dev` + `.env` (plantilla en `.env.example`). El proyecto Vercel actual puede quedar **sin variables de entorno a propósito**; no es un bug ni bloquea el desarrollo.

La configuración del entorno desplegado (env vars, integraciones, redeploy) es responsabilidad del **deploy owner** cuando el proyecto se lleve a la infraestructura definitiva. Este documento es el único checklist de despliegue.

---

## Inventario de variables y servicios

| Área | Variables / acción | Obligatorio | Notas |
|------|-------------------|-------------|-------|
| **Neon** | `DATABASE_URL` o `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `NEON_DATABASE_URL`, `NEON_POSTGRES_URL` (cualquiera; ver `getDatabaseUrl()` en `src/lib/env.server.ts`) | Sí | Sin esto fallan `saveAlta`, webhook fulfillment y tiles Neon del panel |
| **Google Places** | `GOOGLE_PLACES_API_KEY` (o alias `GOOGLE_API_KEY`, `VITE_GOOGLE_API_KEY`, …) | Sí | Búsqueda de restaurantes en el wizard |
| **PostHog cliente** | `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN`, `VITE_PUBLIC_POSTHOG_HOST` | Sí | Token en **build** del cliente; mismo token en **runtime** servidor para `posthog-node` / webhook |
| **PostHog panel** | `POSTHOG_PERSONAL_API_KEY` | Sí (panel) | HogQL lectura proyecto EU 212884; opcional `POSTHOG_API_HOST`, `POSTHOG_PROJECT_ID` |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_ANUAL`, `STRIPE_WEBHOOK_SECRET` | Sí | Checkout + fulfillment autoritativo en `POST /api/stripe/webhook` |
| **App URL** | `APP_URL` | Sí (prod) | Dominio público HTTPS para success/cancel de Stripe |
| **Analytics entorno** | `VITE_VERCEL_ENV=production` | Sí (prod) | Scope **solo Production** en el host; redeploy tras configurar (ver pasos one-time) |
| **Slack** | `SLACK_WEBHOOK_URL` | No | Lead + alta pagada; fire-and-forget |
| **Evolution** | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE_NAME`, `EVOLUTION_API_KEY` | No | Validación WhatsApp; en local se puede usar móvil `000000000` |
| **Namecheap** | `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_CLIENT_IP`, … | No* | O `MOCK_DOMAIN_CHECK=true` para pruebas sin API |
| **Panel** | `INTERNAL_ANALYTICS_PANEL_SLUG`, `INTERNAL_ANALYTICS_REPLAY_URL`, `ANALYTICS_CHECKOUT_SCENARIO_SINCE` | No | Defaults en código; replay es enlace manual a playlist PostHog |
| **Soporte** | `SUPPORT_WHATSAPP`, `VITE_SUPPORT_WHATSAPP` | Recomendado | Copy del wizard |

**Estado del deploy Vercel actual (esperado):** sin variables runtime configuradas — el wizard y el panel degradan por tile en la URL desplegada. Eso es coherente con la política local-first hasta que se ejecute este checklist.

---

## Solo verificable en entorno desplegado

Estas comprobaciones **no** forman parte del criterio de validación local. Quedan pendientes hasta el día del despliegue real:

1. **Webhook Stripe** — firma `whsec_` contra URL pública; en local se usa `stripe listen --forward-to localhost:8080/api/stripe/webhook` o mock sin `alta_fulfilled` completo en PostHog.
2. **Proxy PostHog `/ingest`** — en producción pasa por `vercel.json`; en local por Nitro `routeRules`. Verificar que el host reescribe correctamente hacia EU.
3. **`VITE_*` en build vs runtime** — el token PostHog debe existir en el **build** del cliente; las funciones servidor lo necesitan en **runtime**. Error típico: UI sin eventos o webhook sin `alta_fulfilled`.
4. **`APP_URL` y dominio Stripe** — URLs success/cancel con dominio público y HTTPS.
5. **Evolution API** — validación WhatsApp desde la IP del servidor (puede diferir de desarrollo local).
6. **Namecheap `CLIENT_IP`** — puede requerir la IP saliente del servidor de producción.
7. **Reconciliación Neon ↔ PostHog** — tile del panel interno; solo tiene sentido con tráfico real en el mismo entorno.
8. **`app_env` y filtros del dashboard** — scope `VITE_VERCEL_ENV` solo Production + redeploy; sin eso, métricas de “production” mezclan `development`.
9. **Auth del panel** — `/panel/{slug}` hoy sin autenticación; riesgo operativo antes de tráfico público.
10. **Backfill `paid_at`** — en la BD de producción; timestamps históricos son aproximación (`created_at`; ver `analytics-neon.server.ts`).
11. **Session Replay / playlist** — tile 9 del panel depende de `INTERNAL_ANALYTICS_REPLAY_URL` configurada manualmente en PostHog.
12. **Flujo móvil en red local** — `npm run dev:mobile` cubre pruebas LAN; no equivale a producción con dominio público y certificado.

> **Nota:** el plan `instrumentacion-checkout-env` pedía “validación en preview de Vercel”. Quedó **superado** por esta política: no validamos contra URLs desplegadas hasta el despliegue definitivo; local + tests automatizados son la fuente de verdad.

---

## Pasos one-time por entorno

Ejecutar en el host de producción (o la primera vez que se configure un entorno nuevo):

### 1. Variables de entorno

Copiar `.env.example` → variables del host. Cubrir al menos las filas obligatorias de la tabla superior. En integraciones Neon del host, suele bastar `POSTGRES_URL` (el código acepta el alias).

### 2. Schema Neon

```bash
npm run db:push
# CI / sin TTY:
npm run db:push -- --force
```

Si ya existían filas `paid` antes de la columna `paid_at`, aplicar también `drizzle/0005_paid_at.sql` (backfill `paid_at = created_at` donde `status = paid`).

### 3. PostHog — Authorized URLs

En [Project Settings → Authorized URLs](https://eu.posthog.com/project/212884/settings/project) (proyecto EU **212884**):

- `http://localhost:8080` (desarrollo)
- Dominio público final del wizard (HTTPS)

### 4. Panel interno — autenticación

**Prioridad ALTA:** La pestaña Operaciones expone PII (nombres, teléfonos, notas). La auth del panel deja de ser opcional y pasa a ser **bloqueante** antes de cualquier tráfico real.

Antes de tráfico real, proteger `/panel/{INTERNAL_ANALYTICS_PANEL_SLUG}` (default `m4x8nq2k`) con autenticación real. Hoy la ruta es de prueba sin auth.

### 5. `VITE_VERCEL_ENV` y redeploy

En el host → Environment Variables:

1. `VITE_VERCEL_ENV` con valor `production`.
2. Scope **solo Production** (no Preview ni Development).
3. **Redeploy** tras el cambio (variable de build para Vite).

Sin esto, el cliente PostHog cae a `app_env: development` y contamina funnels si no se filtra. Detalle analítico: `handoff-wizard-analytics-addendum.md` §9.

### 6. Stripe webhook (checkout)

Registrar en Stripe Dashboard el endpoint `https://<dominio>/api/stripe/webhook` con el mismo `STRIPE_WEBHOOK_SECRET` del host. Hoy el handler procesa `checkout.session.completed` (fulfillment de alta).

**Webhooks de suscripción (largo plazo, opcional para el panel):** `customer.subscription.updated` / `deleted` no son necesarios para el tile «Suscripciones al día 30» — ese tile consulta `stripe.subscriptions.retrieve()` bajo demanda con los `stripe_subscription_id` ya guardados en Neon (caché ~4 h). Sí conviene instrumentarlos más adelante si queréis reaccionar a cancelaciones en tiempo real (alertas, win-back), no solo contarlas en revisión semanal.

### 7. Verificación post-deploy (deploy owner)

- [ ] Wizard completo: lead → checkout → pago → `status = paid` en Neon
- [ ] `alta_fulfilled` en PostHog con `app_env: production`, `checkout_scenario`, `onetime_fee_amount`
- [ ] Panel `/panel/{slug}`: tiles Neon OK; tiles PostHog OK con `POSTHOG_PERSONAL_API_KEY`
- [ ] Slack (si configurado): mensaje lead + alta pagada

---

## Referencias

- Desarrollo local: `AGENTS.md`
- Spec métricas / panel: `posthog-dashboard-diagnostico-alta.md`
- Analytics handoff: `handoff-wizard-analytics.md`, `handoff-wizard-analytics-addendum.md`
