# Spec ejecutable — Dashboard «Diagnóstico Alta»

> **Implementación:** panel interno en la app (`/panel/m4x8nq2k` por defecto). Esta spec sigue siendo la fuente de verdad para **eventos, filtros y ventanas**. El montaje manual en PostHog UI queda sustituido por el panel custom (salvo playlist de Session Replay).
>
> **Diseño UI v2 (orientado a decisión)** implementado en `InternalAnalyticsDashboard.tsx` — ver sección al final. Las filas 1–3 y la reconciliación visible de esta spec original están **superadas** por v2 (no borradas: siguen como referencia de queries y modo técnico).

**Proyecto canónico:** [EU 212884](https://eu.posthog.com/project/212884/) — no usar US `491194` (ver `AGENTS.md`).

**Dashboard baseline existente:** [792288 — Analytics basics (wizard)](https://eu.posthog.com/project/212884/dashboard/792288)

Objetivo del dashboard: responder en este orden (1) ¿el proceso de alta funciona?, (2) ¿dónde se caen los usuarios?, (3) ¿por qué se caen ahí? No incluye métricas de plataforma (MRR, clientes totales) — eso es otro dashboard.

**Filtro global del dashboard:** `app_env = production`. Aplicarlo como filtro a nivel de dashboard, no insight por insight. Nota: hasta producción real y scope de `VITE_VERCEL_ENV` corregido (ver [DEPLOY.md](DEPLOY.md)), este filtro incluirá también pruebas internas — aceptado conscientemente.

**Convención de nombres:** todos los insights nuevos con prefijo `[Alta]` para distinguirlos en la lista global del proyecto.

---

## Insights existentes en 792288 (reutilizar / clonar)

| Insight | ID | Relación con esta spec |
|---------|-----|------------------------|
| Wizard conversion funnel | [9pStaAbZ](https://eu.posthog.com/project/212884/insights/9pStaAbZ) | Referencia cliente; no usar como CVR oficial |
| Wizard starts vs altas completadas | [EsSyQKmW](https://eu.posthog.com/project/212884/insights/EsSyQKmW) | Volumen; no duplicar como tile 1 |
| Elección de tipo de dominio | [1lr3oKW7](https://eu.posthog.com/project/212884/insights/1lr3oKW7) | Diagnóstico dominio; distinto de tile 3.2 |
| Tasa de checkout completado | [VAnIwzJn](https://eu.posthog.com/project/212884/insights/VAnIwzJn) | Clonar lógica para tile 2.1 / 3.2 con ventana 48h |
| Recuperaciones checkout cancelado | [xh9cKUvK](https://eu.posthog.com/project/212884/insights/xh9cKUvK) | Complementario; no en esta spec |

---

## Fila 1 — ¿Está funcionando? (3 metric tiles) — **SUPERADA por v2**

> v2: cobros de dominio (Neon count + suma €), altas con subdominio, de contacto a alta (CVR 14d Neon), tile día 30 (espera de cohorte).

### Tile 1.1 — `[Alta] Revenue confirmado / semana`

- **Tipo:** Trend, visualización «Number» (bold number) con comparación vs semana anterior.
- **Evento:** `alta_fulfilled`
- **Filtro:** `onetime_fee_amount > 0`
- **Intervalo:** semanal.
- **Estado:** NUEVO. Depende del commit `2346dc3` desplegado — las altas anteriores al deploy no tienen `onetime_fee_amount` y no aparecerán. No preocuparse si sale vacío al principio.

### Tile 1.2 — `[Alta] Trials iniciados / semana`

- **Tipo:** Trend, «Number», comparación vs semana anterior.
- **Evento:** `alta_fulfilled`
- **Filtro:** `checkout_scenario = trial_free` (convención elegida; no mezclar con `onetime_fee_amount = 0` en el mismo tile para evitar ambigüedad con upgrades sin dominio).
- **Intervalo:** semanal.
- **Estado:** NUEVO. Misma dependencia que 1.1.

### Tile 1.3 — `[Alta] CVR servidor (lead → fulfilled)`

- **Tipo:** Funnel, visualización de conversion rate como número principal.
- **Pasos:** `alta_lead_saved` → `alta_fulfilled` (2 pasos; el intermedio va en la fila 2).
- **Ventana de conversión:** 14 días (el paso lead→fulfilled incluye la decisión humana completa).
- **Estado:** NUEVO como tile; verificar duplicado con [9pStaAbZ](https://eu.posthog.com/project/212884/insights/9pStaAbZ) — si existe funnel cliente equivalente, **no** reutilizar; este es solo servidor.

---

## Fila 2 — ¿Dónde se caen? (2 funnels) — **SUPERADA por v2**

> v2: funnel narrado único de 8 pasos con etiquetas humanas; funnels crudos 2.1/2.2 solo en modo técnico.

### Tile 2.1 — `[Alta] Funnel servidor (autoritativo)`

- **Tipo:** Funnel, barras con drop-off entre pasos.
- **Pasos:**
  1. `alta_lead_saved`
  2. `checkout_session_created`
  3. `alta_fulfilled`
- **Ventana de conversión:** **48 horas**. Justificación: checkout→fulfilled acotado por `expires_at` de Stripe (24h); 48h da margen sin diluir fricción. **No** usar 14 días aquí (addendum §3).
- **Estado:** Ajustar clon de [VAnIwzJn](https://eu.posthog.com/project/212884/insights/VAnIwzJn) / funnel servidor. **CVR oficial** para reportes externos (Lanzadera, Orbita).

### Tile 2.2 — `[Alta] Funnel wizard (diagnóstico de pasos)`

- **Tipo:** Funnel, barras.
- **Pasos (orden del wizard):**

| # | Evento | Nota |
|---|--------|------|
| 1 | `wizard_started` | 1×/pestaña |
| 2 | `wizard_place_confirmed` | Converge GMB (`wizard_restaurant_selected`) y manual (`wizard_restaurant_entered_manually`); no usar solo «búsqueda GMB» |
| 3 | `wizard_domain_type_chosen` | Elección subdominio vs custom |
| 4 | `wizard_brecha_viewed` | Commit `8bb80b7`; omitir hasta deploy |
| 5 | `wizard_contact_submitted` | Cliente; servidor autoritativo = `alta_lead_saved` |
| 6 | `wizard_checkout_started` | Cliente; servidor = `checkout_session_created` |

- **Ventana de conversión:** **24 horas** (sesión de wizard; ventana larga mezcla pestañas distintas).
- **Descripción obligatoria del insight:** «Solo diagnóstico de pasos. NO usar su CVR total como oficial: `wizard_started` es 1×/pestaña y el merge anon→alta_id no está validado (addendum §4). El CVR oficial es el funnel servidor (tile 2.1).»
- **Estado:** Extender funnel de [9pStaAbZ](https://eu.posthog.com/project/212884/insights/9pStaAbZ) con pasos intermedios; añadir paso 4 tras deploy de `wizard_brecha_viewed`.

**Validación del merge (roadmap ticket 3):** comparar usuarios en `wizard_checkout_started` (2.2) vs `checkout_session_created` (2.1) mismo período. Si difieren >15–20%, documentar y usar 2.2 solo como drop relativo, no absolutos.

---

## Fila 3 — ¿Por qué se caen ahí? (4 tiles de causas) — **SUPERADA por v2**

> v2: tiles en prosa (búsqueda, dominio pago vs gratis, canales, replays). Datos crudos en modo técnico.

### Tile 3.1 — `[Alta] Errores GMB`

- **Tipo:** Trend, línea semanal.
- **Evento:** `wizard_restaurant_search_error`
- **Breakdown:** propiedad `error` (si volumen bajo, sin breakdown).
- **Lectura:** subida = expulsión técnica en paso 1; correlacionar con drop `wizard_started` → `wizard_place_confirmed` en 2.2.
- **Estado:** NUEVO (no hay insight equivalente nombrado en 792288).

### Tile 3.2 — `[Alta] CVR por escenario de checkout`

- **Tipo:** Funnel `checkout_session_created` → `alta_fulfilled`, breakdown por `checkout_scenario`.
- **Ventana:** 48h (igual que 2.1).
- **Excluir:** `management_fee` del breakdown (flag apagado).
- **Estado:** NUEVO. Depende de `2346dc3` + altas nuevas con `checkout_scenario` en `alta_fulfilled`.

### Tile 3.3 — `[Alta] Atribución UTM`

- **Tipo:** Trend de `wizard_started`, breakdown por `utm_source`.
- **Intervalo:** semanal.
- **Descripción obligatoria:** «Volumen inflable por multi-pestaña (addendum §4) — comparar canales entre sí, no leer absolutos como personas únicas. Para CVR por canal, cruzar con funnel servidor cuando el merge esté validado.»
- **Estado:** NUEVO.

### Tile 3.4 — `[Alta] Replays de abandono en checkout`

- **Tipo:** enlace / playlist Session Replay (no insight numérico).
- **Filtro playlist:** sesiones con `wizard_checkout_started` y **sin** `alta_fulfilled`, recientes primero.
- **En dashboard:** texto + link a la playlist guardada en PostHog → Session Replay.
- **Estado:** NUEVO (manual en UI). Pendiente P2 legal: consentimiento replay antes de tráfico real.

---

## Orden de montaje

1. **Hoy (sin dependencias de deploy):** crear dashboard con filtro global; tiles 2.1, 2.2 (sin paso brecha), 3.1, 3.4 (playlist manual).
2. **Tras deploy `2346dc3` + primeras altas nuevas:** tiles 1.1, 1.2, 3.2.
3. **Tras deploy `8bb80b7` (`wizard_brecha_viewed`):** añadir paso brecha a 2.2.
4. **En cualquier momento:** 1.3, 3.3 (1.3 tras verificar que no duplica mal 9pStaAbZ).

## Qué NO montar

- Alerta automática gap contacto→lead (addendum §6.9).
- Breakdown `management_fee` hasta activar flag.
- CVR end-to-end desde `wizard_started` como oficial hasta validar merge.
- Métricas plataforma (MRR, Pro activos): otro dashboard.

---

## Pasos en PostHog UI (checklist operativo)

1. **Crear dashboard** «Diagnóstico Alta» (o renombrar 792288 si se consolida).
2. **Dashboard settings → filters:** `app_env` equals `production`.
3. Crear insights con prefijo `[Alta]` según filas 1–3.
4. **Session Replay:** guardar playlist tile 3.4; pegar URL en descripción del dashboard.
5. Tras despliegue: revisar filtro `app_env = production` según [DEPLOY.md](DEPLOY.md) (scope `VITE_VERCEL_ENV` + redeploy).

## Reconciliación (fuera del dashboard, semanal) — **SUPERADA como sección visible**

> v2: nota al pie del funnel narrado. Cards 7d/30d solo en modo técnico.

Contar `status = paid` en Neon vs `alta_fulfilled` en PostHog (mismo rango, `app_env = production`). Si divergen, el North Star de PostHog subcuenta (addendum §5).

---

## Diseño implementado (v2 — orientado a decisión)

Panel para founder no técnico: cada tile responde su pregunta en una frase; números como apoyo. Sin nombres de evento en vista principal.

### A. Resumen en una frase

Card superior con reglas: altas semanales Neon (dominio de pago vs subdominio gratis) + mayor fuga del funnel narrado. Si `n < 20` o sin altas: «Sin actividad suficiente esta semana para un resumen.»

### B. Semáforo por sección

- **¿Funciona?** verde si reconciliación 7d cuadra y ≥1 alta en rango.
- **¿Dónde?** ámbar si drop-off >25% con `n ≥ 20`; gris si `n < 20`.
- **¿Por qué?** verde sin errores GMB en semana; ámbar si hay errores.

### C. Fila 1 (4 tiles)

| Tile | Fuente |
|------|--------|
| Cobros de dominio | Neon: count + `SUM(onetime_fee_amount)` semanal |
| Altas con subdominio | Neon: fee 0/null |
| De contacto a alta | Neon CVR 14d + cruce leads PostHog |
| Suscripciones al día 30 | Neon `stripe_subscription_id` + consulta Stripe API bajo demanda — ver abajo |

### D. Funnel narrado (8 pasos, /100)

**Ventana única 48 h** para los 8 pasos (decisión explícita: legibilidad sobre precisión de ventanas mixtas). La spec original usaba 24 h para pasos wizard y 48 h para servidor; el funnel narrado unifica en 48 h. Para análisis fino de ventanas, **modo técnico** (funnel wizard 24 h, funnel servidor 48 h).

Mapeo humano → evento (tooltip / modo técnico):

| Etiqueta | Evento |
|----------|--------|
| Entró al asistente | `wizard_started` |
| Buscó su restaurante | `wizard_search_performed` |
| Confirmó su restaurante | `wizard_place_confirmed` (+ `place_origin`) |
| Eligió dominio | `wizard_domain_type_chosen` |
| Vio la oferta de upgrade | `wizard_brecha_viewed` |
| Dejó su contacto | `alta_lead_saved` |
| Llegó al pago | `checkout_session_created` |
| Activó su página | `alta_fulfilled` |

Sub-líneas: `place_origin` bajo confirmación; dominio pago vs gratis bajo activación. Nota reconciliación al pie.

### E. ¿Por qué? (conclusiones)

Búsqueda, dominio pago vs gratis (`management_fee` excluido), canales UTM, replays enlazados al paso de mayor fuga.

### F. Modo técnico

Toggle sin persistencia: funnels crudos 2.1/2.2, reconciliación 7d/30d, nombres de evento.

### Eventos nuevos (instrumentación)

| Evento | Cuándo | Propiedades |
|--------|--------|-------------|
| `wizard_search_performed` | Al lanzar búsqueda GMB (fetch debounced, al arrancar fetch) | `search_attempt`, `is_first_search`, `query_length` |
| `wizard_place_confirmed` | Confirmar restaurante | + `place_origin`: `google` \| `manual` |

**Nota `search_attempt`:** cuenta queries debounced distintas, no reintentos deliberados. Alguien que teclea despacio puede generar varias capturas (`"ric"` → `"ricard"` → `"ricard camarena"`). Para el funnel da igual (PostHog cuenta personas únicas por paso). **No usar `search_attempt` como métrica de frustración sin suavizar.**

**Nota `place_origin`:** histórico pre-deploy se infiere en HogQL vía `gmb_place_id` si falta la propiedad.

### Tile día 30 — retención post-trial

1. **Modo espera** — hasta `min(paid_at) + 30d`: «Todas en trial…».
2. **Modo retención** — cohorte con ≥30 días desde `paid_at`: `stripe.subscriptions.retrieve()` por cada `stripe_subscription_id` en Neon al cargar el panel (caché ~4 h). Estados: `active`, `trialing`, `past_due` cuentan como retenidos; breakdown dominio de pago vs subdominio gratis.
3. **Sin `STRIPE_SECRET_KEY`** — tile degradado con mensaje explícito.

La API de Stripe es retroactiva (estado actual sin haber escuchado eventos intermedios). **No requiere webhooks** para el tile semanal. Webhooks `customer.subscription.updated` / `deleted` siguen siendo lo correcto a largo plazo para reaccionar a cancelaciones en tiempo real — ver [DEPLOY.md](DEPLOY.md).

---

## Pre-lanzamiento

Checklist completo de despliegue (variables, pasos one-time, riesgos solo verificables en prod): **[DEPLOY.md](DEPLOY.md)**.

Resumen para el panel de esta spec:

- Filtro global del dashboard: `app_env = production` (ver nota al inicio del documento).
- Auth en `/panel/{slug}` antes de tráfico real.
- `paid_at` en Neon: migración `drizzle/0005_paid_at.sql` (backfill aproximado documentado en `analytics-neon.server.ts`).

---

## v4 — Hero registros y preferencia de dominio

**Commit:** `feat: panel v4 - registrations hero and domain preference`  
**Implementación:** `InternalAnalyticsDashboard.tsx` y componentes en `src/components/analytics/`.

### Nueva jerarquía (arriba → abajo)

1. **Hero (grid 2 columnas)** — sustituye resumen editorial v2 y fila 1 de métricas semanales.
   - **Registros (Neon):** total del período con delta vs período anterior; desglose dominio de pago (count + €) vs subdominio gratis; mini-tendencia últimas 4 semanas (texto `1 · 2 · 2 · 3` o sparkline SVG si ≥8 semanas de historia).
   - **¿Qué eligen: gratis o pago? (PostHog):** barra de reparto de `wizard_domain_type_chosen`; mini-cards de conversión elegir→`alta_fulfilled` por tipo (48 h); insight por reglas con n&lt;20 en gris.

2. **Chart diario** — bajo card Registros, solo en rangos 7/30 días (`paid_at` truncado a día).

3. **¿Funciona?** — CVR contacto→alta (Neon 14 d).

4. **¿Dónde?** — funnel narrado **compacto** (columnas verticales, peor paso ámbar).

5. **¿Por qué?** — día 30 en franja horizontal; búsqueda; **¿Cuándo empiezan el alta?** (`wizard_started`, Europe/Madrid); canales UTM; replays. **Eliminado:** tile dominio pago vs gratis (vive en hero).

### Fuentes y mapeo `domain_type`

| Propiedad en evento | UI |
|---------------------|-----|
| `custom_domain` | Dominio de pago (verde) |
| `free_subdomain` | Subdominio gratis (neutro) |

HogQL: `if(properties.domain_type = 'custom_domain', 'paid', 'free')`.

### Reglas de insight (hero derecha)

- n &lt; 20 → «Muestra insuficiente para conclusiones» (gris).
- eligen-pago ≥55% y Δ conversión &lt;10 pp → verde precio no es barrera.
- eligen-pago ≥55% y conversión pago &lt;60% de gratis → ámbar revisar precio/momento.
- eligen-gratis ≥55% → mayoría prefiere empezar gratis.

### Transversales v4

- Selector de rango en píldoras 7/30/90; botón «Técnico» discreto.
- `tabular-nums` en cifras del panel.
- Máximo 1 verde + 2 ámbar simultáneos en pantalla.
- Modo técnico sin cambios (funnels crudos, reconciliación).
