# Handoff: Wizard PowerUp — Analytics y dashboard

> ⚠️ **Leer primero:** [`handoff-wizard-analytics-addendum.md`](./handoff-wizard-analytics-addendum.md) — corrige el North Star, las ventanas de funnel y el mecanismo de exclusión de entorno antes de usar este documento para definir objetivos o construir el dashboard.

Documento para otra IA (o analista) que deba **definir objetivos de medición** y **diseñar o mejorar el dashboard** del wizard de alta de páginas web para restaurantes.

**Audiencia:** producto, growth, analytics. No sustituye `AGENTS.md` (desarrollo) ni `posthog-setup-report.md` (historial de integración).

---

## 1. Contexto producto

| Campo | Valor |
|-------|-------|
| Producto | PowerUp Menu — wizard de alta de **página web** para restaurantes en España |
| Usuario | Dueño o responsable del local |
| Conversión de negocio | Alta **pagada** (Stripe) → equipo opera la web y contacta por WhatsApp |
| North Star (analytics) | `alta_fulfilled` — pago confirmado vía webhook Stripe |
| Lead operativo | `alta_lead_saved` — contacto guardado en Neon antes del pago |

**Qué NO es conversión:** `wizard_confirmed` solo indica que el usuario llegó a `/confirmacion` tras Stripe; puede dispararse antes de que el webhook haya persistido `paid` en BD.

**Modelo de cobro (afecta segmentación):**

| `checkout_scenario` | Cuándo | Cobro hoy |
|---------------------|--------|-----------|
| `trial_free` | Subdominio gratuito `*.powerup.menu` | 0 € (30 días prueba Plan Pro) |
| `custom_domain` | Dominio propio `.es` u otro | Precio dominio + suscripción |
| `management_fee` | `has_existing_website` + fee activo | 49 € (flag `ENABLE_MANAGEMENT_FEE` — **apagado** en producción) |

**Upgrade PowerUp:** `powerup_customer === "yes"` si ya tiene carta en `*.powerup.menu` (detectado en enrichment o flujo).

---

## 2. Flujo del wizard

### 2.1 Diagrama lógico

```
Entrada URL
    │
    ▼
wizard_started (1× por pestaña/sesión)
    │
    ▼
[Paso restaurante] ──GMB──► wizard_restaurant_selected
    │              ──manual──► wizard_restaurant_entered_manually
    │              ──error──► wizard_restaurant_search_error
    ▼
[Paso encontrado + enrichment]
    ▼
[Paso confirmar info] ──► wizard_place_confirmed
    │
    ▼
[Paso brecha PowerUp] (solo si aplica upgrade)
    │
    ▼
[Paso elegir dominio] ──► wizard_domain_type_chosen
    │                    wizard_custom_domain_selected
    │                    wizard_domain_checked_manually
    ▼
[Paso resumen] ──► wizard_order_reviewed
    │
    ▼
[Paso contacto] ──► wizard_contact_submitted (cliente)
    │                    saveAlta → alta_lead_saved (servidor) + identify(alta_id)
    │                    Slack: lead
    ▼
createCheckout → checkout_session_created (servidor)
    │
    ▼
wizard_checkout_started (cliente) → redirect Stripe Checkout (hosted)
    │
    ├── cancel ──► ?checkout_cancelled=1 ──► wizard_checkout_cancelled_recovered
    │
    └── success ──► /confirmacion ──► wizard_confirmed (cliente)
                              │
                              ▼
                    POST /api/stripe/webhook ──► alta_fulfilled (servidor, autoridad)
                              │                      Slack: alta pagada
                              └── finalizeCheckout (UX idempotente, sin evento PH)
```

### 2.2 Pasos UI (`StepId`)

| StepId | Descripción | Evento dedicado |
|--------|-------------|-----------------|
| `restaurante` | Búsqueda GMB o alta manual | `wizard_restaurant_*`, `wizard_restaurant_search_error` |
| `encontrado` | Ficha enriquecida (loading/ready) | — (inferir por `wizard_place_confirmed`) |
| `confirmarInfo` | Usuario confirma datos del local | `wizard_place_confirmed` |
| `brecha` | Rama upgrade cliente PowerUp | — |
| `elegirDominio` | Subdominio vs dominio custom | `wizard_domain_*` |
| `resumen` | Resumen pedido + CTA | `wizard_order_reviewed` |
| `contacto` | Nombre + WhatsApp + términos | `wizard_contact_submitted` |
| `enviando` | Transitorio saveAlta + checkout | `alta_lead_saved`, `checkout_session_created`, `wizard_checkout_started` |

**Hueco:** no hay evento `wizard_step_abandoned` ni heartbeat por paso. El abandono se infiere por **último evento** antes de salir de sesión.

### 2.3 Archivos clave

| Área | Archivo |
|------|---------|
| UI wizard | `src/components/asistente/AsistenteAlta.tsx` |
| Dominio | `src/components/asistente/StepElegirDominio.tsx` |
| Server: lead + checkout | `src/lib/alta.functions.ts` (`saveAlta`, `createCheckout`, `finalizeCheckout`) |
| Webhook Stripe | `src/lib/stripe-webhook.server.ts` |
| Confirmación UX | `src/routes/confirmacion.tsx` |
| Escenarios checkout | `src/lib/checkout-scenario.ts` |
| BD altas | `src/db/schema.ts` — `status`: `pending_payment` \| `paid` |

---

## 3. Stack (solo lo relevante para medir)

| Capa | Tecnología | Implicación analytics |
|------|------------|----------------------|
| Frontend | TanStack Start + React, PostHog JS (`/ingest` proxy EU) | Eventos cliente; session replay |
| Servidor | Nitro/Vercel serverless, `posthog-node` | Eventos servidor en webhook y `saveAlta`/`createCheckout` |
| Pagos | Stripe Checkout **redirect** (no embebido) | Salida del sitio → posible abandono; recuperación vía `?checkout_cancelled=1` |
| BD | Neon Postgres + Drizzle (`altas`) | Verdad offline; warehouse opcional |
| Ops | Slack Incoming Webhook | Lead/pago en tiempo real; **no** está en PostHog |
| WhatsApp | Evolution API (validación fire-and-forget) | No bloquea funnel; no genera evento PH |

**PostHog canónico:** proyecto EU **[212884](https://eu.posthog.com/project/212884/)**. No usar US `491194`.

**Dashboard existente:** [792288 — Analytics basics (wizard)](https://eu.posthog.com/project/212884/dashboard/792288)

---

## 4. Identidad PostHog

| Momento | Acción |
|---------|--------|
| Antes de `saveAlta` | `distinct_id` anónimo de PostHog (cookie) |
| Tras `saveAlta` exitoso | `identify(alta_id)` — UUID de la fila `altas` |
| Person properties | `whatsapp`, `contact_name` (una vez por `alta_id`) |
| Eventos servidor | `distinctId: alta_id` en `alta_lead_saved`, `checkout_session_created`, `alta_fulfilled` |

**Reglas:**

- **Nunca** usar WhatsApp como `distinct_id` (PII + colisiones).
- `wizard_started` usa `sessionStorage` (`ph_wizard_started`) → **máximo 1 por pestaña**, aunque el usuario reinicie el wizard.
- En recuperación post-cancel (`recoverFromCancel`), se vuelve a llamar `identify(alta_id)` si hay draft con `alta_id`.

---

## 5. Taxonomía de eventos

### 5.1 Funnel principal

| Orden | Evento | Origen | Cuándo | Propiedades clave |
|-------|--------|--------|--------|-------------------|
| 1 | `wizard_started` | Cliente | Primera carga del wizard en la pestaña | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` |
| 2a | `wizard_restaurant_selected` | Cliente | Pick en resultados GMB | `restaurant_name`, `restaurant_address`, `gmb_place_id` |
| 2b | `wizard_restaurant_entered_manually` | Cliente | Alta manual sin GMB | `restaurant_name`, `restaurant_address` |
| 3 | `wizard_place_confirmed` | Cliente | Confirma ficha del local | `restaurant_name`, `gmb_place_id`, `enrichment_status` |
| 4 | `wizard_order_reviewed` | Cliente | Continúa desde resumen | `restaurant_name`, `domain`, `domain_is_custom`, `powerup_customer`, `checkout_scenario` |
| 5a | `wizard_contact_submitted` | Cliente | Envía contacto (antes de servidor) | Igual que resumen |
| 5b | `alta_lead_saved` | **Servidor** | INSERT en Neon OK | `alta_id`, `restaurant_name`, `has_gmb`, `domain_is_custom`, `domain_initial_choice`, `domain_downgraded`, `powerup_customer` |
| 6a | `wizard_checkout_started` | Cliente | Redirect a Stripe | `alta_id`, + props de resumen |
| 6b | `checkout_session_created` | **Servidor** | Sesión Stripe creada | `alta_id`, `restaurant_name`, `powerup_customer`, `stripe_session_id` |
| 7 | `alta_fulfilled` | **Servidor** | Webhook `checkout.session.completed` | `alta_id`, `stripe_session_id`, `stripe_customer_id`, `stripe_subscription_id`, `source: "stripe_webhook"` |

**Autoridad para ratios de conversión:**

| Paso | Usar primero | Respaldo cliente |
|------|--------------|------------------|
| Lead | `alta_lead_saved` | `wizard_contact_submitted` |
| Checkout iniciado | `checkout_session_created` | `wizard_checkout_started` |
| Pago | `alta_fulfilled` | — (no usar `wizard_confirmed`) |

### 5.2 Eventos de dominio

| Evento | Cuándo | Propiedades |
|--------|--------|-------------|
| `wizard_domain_type_chosen` | Elige subdominio gratis vs custom; corrección al skip con `is_correction: true` | `domain_type`, `powerup_customer`, `restaurant_name`, `is_correction?`, `correction_reason?` |
| `wizard_domain_downgraded_to_free` | Eligió custom y sigue con subdominio gratis (skip Namecheap) | `reason`: `namecheap_degraded` \| `skip_link`, `prefetch_status`, `candidate_domain`, `restaurant_name`, `powerup_customer` |
| `wizard_restaurant_located` | Puente funnel: búsqueda GMB o alta manual | `method`: `search` \| `manual`, `restaurant_name` |
| `wizard_custom_domain_selected` | Confirma dominio concreto | `domain`, `domain_price`, `restaurant_name` |
| `wizard_domain_checked_manually` | Búsqueda manual Namecheap | `domain`, `result`: `available` \| `unavailable`, `price` o `alternatives_count` |

Prefetch de `{slug}.es` en paralelo al enrichment **no** emite evento propio; solo cuenta si el usuario confirma o busca manualmente.

### 5.3 Diagnóstico y recuperación

| Evento | Cuándo | Propiedades |
|--------|--------|-------------|
| `wizard_restaurant_search_error` | Fallo búsqueda GMB | `error`, `query` |
| `wizard_checkout_cancelled_recovered` | Vuelve con `?checkout_cancelled=1` | `has_draft`, `alta_id?`, `restaurant_name?` |
| `wizard_confirmed` | Página `/confirmacion` | `alta_id`, `powerup_customer`, `restaurant_name` |

### 5.4 Eventos que NO están en PostHog (solo logs servidor)

| Evento log | Significado |
|------------|-------------|
| `posthog_server_config_missing` | Falta token PH en runtime Vercel → no `alta_fulfilled` |
| `checkout_session_not_complete` / `checkout_session_missing_alta_id` | Webhook recibido pero sesión inválida |
| `fulfill_still_pending` | Conflicto fulfillment → retry Stripe |
| `slack_*` | Notificaciones operativas |

**Local sin Stripe:** `markAltaPaidMock` marca `paid` en BD y dispara Slack, pero **no** emite `alta_fulfilled` en PostHog. Los funnels de producción deben filtrar entorno o asumir este hueco en dev.

---

## 6. Segmentos recomendados

| Dimensión | Propiedad | Valores | Uso |
|-----------|-----------|---------|-----|
| Adquisición | UTM en `wizard_started` | `utm_*` | Atribución campañas |
| Tipo cliente | `powerup_customer` | `yes` / `no` / `unknown` (solo cliente pre-save) | Upgrade vs nuevo |
| Dominio | `domain_is_custom` o `domain_type` | bool / enum | Fricción y ticket |
| Escenario cobro | `checkout_scenario` | `trial_free`, `custom_domain`, `management_fee` | Ticket y copy |
| Origen restaurante | `has_gmb` (servidor) o `gmb_place_id` (cliente) | bool / string | Calidad del lead |
| Enrichment | `enrichment_status` | `idle`, `loading`, `ready`, `degraded` | Calidad datos GMB |
| Dispositivo | PostHog default | `$device_type`, etc. | Mobile vs desktop |

---

## 7. Sección A — Brief para medir objetivos

Usar esta plantilla al trabajar con otra IA sobre **qué medir y por qué**.

### 7.1 Preguntas de negocio (prioridad)

1. ¿Qué % de visitantes que abren el wizard acaban pagando? → `alta_fulfilled` / `wizard_started`
2. ¿Dónde se cae el funnel? → funnel ordenado pasos §5.1; comparar cliente vs servidor en lead/checkout
3. ¿El dominio custom reduce conversión? → breakdown `domain_is_custom` o `checkout_scenario`
4. ¿Los upgrades PowerUp convierten distinto? → breakdown `powerup_customer`
5. ¿Recuperamos abandonos de Stripe? → `wizard_checkout_cancelled_recovered` → ¿llegan a `alta_fulfilled`?
6. ¿La búsqueda GMB falla y mata sesiones? → `wizard_restaurant_search_error` rate vs `wizard_started`
7. ¿Qué campañas traen leads que pagan? → UTM × funnel hasta `alta_fulfilled`

### 7.2 Métricas propuestas

| Métrica | Definición | Eventos |
|---------|------------|---------|
| **North Star** | Altas pagadas / semana | `alta_fulfilled` (unique users o count) |
| Lead rate | % sesiones con lead guardado | `alta_lead_saved` / `wizard_started` |
| Contact → lead gap | Cliente envió pero servidor no guardó | `wizard_contact_submitted` − `alta_lead_saved` |
| Checkout start rate | % leads que abren Stripe | `checkout_session_created` / `alta_lead_saved` |
| Checkout completion | % checkouts que pagan | `alta_fulfilled` / `checkout_session_created` |
| End-to-end CVR | % started → paid | `alta_fulfilled` / `wizard_started` |
| Recuperación Stripe | Usuarios que vuelven tras cancel | `wizard_checkout_cancelled_recovered` |
| Error GMB | Sesiones con error búsqueda | `wizard_restaurant_search_error` / `wizard_started` |

### 7.3 Parámetros de funnel PostHog

- **Ventana de conversión:** 14 días (alineado con Stripe Checkout por defecto)
- **Orden:** strict u ordered según si quieres permitir pasos intermedios omitidos en analytics
- **Agregación:** por usuario (`distinct_id`); tras lead, `alta_id` une cliente y servidor
- **Entorno:** excluir tráfico interno / preview Vercel si contamina

### 7.4 Guardrails (salud del producto)

- Tasa `wizard_restaurant_search_error` subiendo
- Gap `wizard_contact_submitted` ≫ `alta_lead_saved` (fallos `saveAlta`, schema BD, etc.)
- `wizard_confirmed` ≫ `alta_fulfilled` (webhook retrasado o mal configurado)
- Logs `posthog_server_config_missing` en producción

### 7.5 Fuentes complementarias

| Fuente | Uso |
|--------|-----|
| PostHog | Funnels, trends, replay, cohortes |
| Neon `altas` | Conteo ground truth, revenue fields, `domain_initial_choice` / `domain_downgraded` (intención brecha vs resultado lead), warehouse join |
| Slack | Alertas operativas inmediatas (lead vs pagado) |
| Stripe Dashboard | Pagos fallidos, disputes (no instrumentado en PH aún) |

---

## 8. Sección B — Especificación del dashboard

Baseline: [Dashboard 792288](https://eu.posthog.com/project/212884/dashboard/792288). Insights ya creados (ver `posthog-setup-report.md`):

| Insight | ID slug | Qué mide |
|---------|---------|----------|
| Wizard conversion funnel | `9pStaAbZ` | Funnel 4 pasos → fulfilled |
| Starts vs completadas | `EsSyQKmW` | Trend semanal |
| Elección dominio | `1lr3oKW7` | free vs custom |
| Tasa checkout completado | `VAnIwzJn` | fulfilled / checkout started |
| Recuperaciones cancel | `xh9cKUvK` | post-cancel recovery |

### 8.1 Tiles recomendados (mínimo viable)

| # | Título | Tipo | Query |
|---|--------|------|-------|
| 1 | **Funnel conversión (servidor)** | Funnel ordenado | `wizard_started` → `alta_lead_saved` → `checkout_session_created` → `alta_fulfilled` |
| 2 | **CVR end-to-end** | Formula / trend | `alta_fulfilled` / `wizard_started` × 100 |
| 3 | **Leads vs pagos** | Trends (semanal) | `alta_lead_saved` vs `alta_fulfilled` |
| 4 | **Checkout completion** | Formula | `alta_fulfilled` / `checkout_session_created` |
| 5 | **Mix dominio** | Breakdown | `wizard_domain_type_chosen` por persona (última elección, `argMax`); downgrades vía `wizard_domain_downgraded_to_free` |
| 6 | **Upgrade PowerUp** | Breakdown | `alta_lead_saved` por `powerup_customer` |
| 7 | **Errores GMB** | Trend | `wizard_restaurant_search_error` |
| 8 | **Recuperación Stripe** | Trend | `wizard_checkout_cancelled_recovered` |
| 9 | **Atribución** | Breakdown | `wizard_started` por `utm_source` / `utm_campaign` |

### 8.2 Tiles opcionales (segunda iteración)

| Título | Tipo | Notas |
|--------|------|-------|
| Funnel micro (pre-lead) | Funnel | `wizard_started` → `wizard_place_confirmed` → `wizard_order_reviewed` |
| Tiempo hasta lead | Time to convert | `wizard_started` → `alta_lead_saved` |
| Dominio manual vs prefetch | Breakdown | `wizard_domain_checked_manually` vs `wizard_custom_domain_selected` sin manual |
| Gap contacto/lead | Formula | `wizard_contact_submitted` − `alta_lead_saved` |
| Session replay playlist | Link manual | Sesiones con `wizard_contact_submitted` sin `alta_lead_saved` |

### 8.3 Qué NO duplicar

- No crear dos funnels idénticos con eventos cliente y servidor en el mismo paso (elige autoridad §5.1).
- No usar `wizard_confirmed` como paso final de conversión en el funnel principal.
- No mezclar proyecto US `491194` con EU `212884`.

### 8.4 Alertas sugeridas (PostHog o externas)

| Condición | Acción |
|-----------|--------|
| `alta_lead_saved` > 0 y `alta_fulfilled` = 0 en 24h | Revisar webhook Stripe + env PH runtime |
| `wizard_contact_submitted` / `alta_lead_saved` > 1.2 | Revisar `saveAlta` / schema Neon |
| Spike `wizard_restaurant_search_error` | Revisar cuota Google Places |

---

## 9. Gotchas y limitaciones

1. **`wizard_confirmed` ≠ pago confirmado** — es UX en `/confirmacion`; la conversión autoritativa es `alta_fulfilled`.
2. **`wizard_started` es 1× por pestaña** — no refleja reintentos en la misma sesión de navegador.
3. **Sin evento por paso de abandono** — usar funnel drop-off o último evento en sesión.
4. **Mock local sin `alta_fulfilled`** — desarrollo sin Stripe no alimenta el paso final del funnel.
5. **Identidad pre/post lead** — antes de `identify`, eventos van al anon ID; PostHog puede mergear si la sesión es continua.
6. **`business_term` del enrichment** — existe en `place_profile` pero **no** se usa en copy ni eventos actuales; no segmentar sin validar calidad.
7. **Stripe redirect** — abandono en página Stripe no genera evento hasta volver con `checkout_cancelled` o completar pago.
8. **Slack** — útil para ops, invisible en PostHog.

---

## 10. Checklist para la otra IA

Al proponer objetivos o dashboard, verificar:

- [ ] ¿La métrica de conversión usa `alta_fulfilled`?
- [ ] ¿Lead y checkout usan eventos servidor cuando existen?
- [ ] ¿La ventana de conversión es ≥ 14 días?
- [ ] ¿Los breakdowns usan propiedades que existen en el código (§5)?
- [ ] ¿Se excluye tráfico de preview/staging?
- [ ] ¿Las alertas distinguen fallo de producto vs fallo de integración (webhook, env)?

---

## 11. Referencias

| Recurso | URL / path |
|---------|------------|
| Proyecto PostHog EU | https://eu.posthog.com/project/212884/ |
| Dashboard wizard | https://eu.posthog.com/project/212884/dashboard/792288 |
| Desarrollo / env | `AGENTS.md` |
| Historial integración PH | `posthog-setup-report.md` |
| UI principal | `src/components/asistente/AsistenteAlta.tsx` |

*Última revisión: alineada con instrumentación actual del repo (eventos cliente + `alta_lead_saved`, `checkout_session_created`, `alta_fulfilled` servidor).*
