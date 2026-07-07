# Addendum: Correcciones antes de usar `handoff-wizard-analytics.md`

Este addendum se apoya en dos pasadas: una auditoría inicial sobre el documento (sin acceso al repo) y una validación posterior contra el código real (`stripe-webhook.server.ts`, `alta.functions.ts`, `alta-config.ts`, `__root.tsx`). Donde ambas coinciden, se marca **confirmado**. Donde el código matiza o corrige la hipótesis inicial, se marca **corregido**.

Cualquier IA o analista que trabaje sobre el handoff original debe leer esto primero: cambia la interpretación de varias métricas del §7 y §8.

---

## 1. Definiciones corregidas

**El North Star tal como está definido mezcla dos cosas distintas.**

`alta_fulfilled` se dispara igual para:
- un cliente que paga dominio + suscripción (revenue real hoy), y
- un cliente `trial_free` que arranca un trial de 30 días a coste 0 EUR hoy.

Ambos pasan por el mismo Stripe Checkout (`checkout.session.completed`) y disparan el mismo evento servidor. **Confirmado por código: `alta_fulfilled` no lleva `checkout_scenario` ni ningún campo de importe.** Sus propiedades actuales son:

```text
alta_id, stripe_session_id, stripe_customer_id, stripe_subscription_id, source: "stripe_webhook"
```

Consecuencia práctica: hoy no puedes segmentar el North Star por revenue real vs trial sin uno de estos caminos:
1. Breakdown por `alta_id` cruzando con `checkout_scenario` (de `wizard_checkout_started`, evento cliente) o `domain_is_custom` (de `alta_lead_saved`, evento servidor). Funciona, pero depende de joins.
2. Join con Neon `altas` (`domain_is_custom`, `onetime_fee_amount`) — más fiable como ground truth.
3. Instrumentar `checkout_scenario` / `amount_due_today` en `alta_fulfilled` — solución recomendada a medio plazo.

**Matiz importante sobre el join:** `domain_is_custom` no separa todos los casos de revenue. Por ejemplo, `trial_free` y algunos upgrades pueden compartir `domain_is_custom = false` con 0 EUR hoy. Para separar revenue de forma robusta, priorizar `onetime_fee_amount` (Neon) o instrumentar importe en el webhook.

**Recomendación de naming:** separar dos conceptos que el handoff original trataba como uno:
- **Checkout completado** = fulfillment técnico (lo que mide `alta_fulfilled` hoy).
- **Revenue confirmado** = checkout completado con importe > 0 hoy.

No reportar "altas pagadas / semana" sin aclarar cuál de las dos definiciones se usa.

---

## 2. Propiedades que faltan en código

| Falta | Dónde debería vivir | Por qué importa |
|---|---|---|
| `checkout_scenario` o `amount_due_today` | `alta_fulfilled` (webhook) | Sin esto, el North Star segmentado depende de join |
| `app_env` (`production` / `preview` / `development`) | Eventos cliente vía `PostHogProvider` (`__root.tsx`) | No existe hoy; el checklist de exclusión de entorno es incumplible |
| `wizard_brecha_viewed` / `wizard_upgrade_offered` | Paso `brecha` en `AsistenteAlta.tsx` | Sin evento propio no se mide abandono en ese paso |

**Confirmado:** no hay `is_internal`, `$environment` ni filtro de hostname en el código actual.

**Mecanismo recomendado para `app_env`:**
- Inyectar propiedad global desde `VERCEL_ENV` en init de PostHog.
- **Con fallback explícito** a `development` cuando no exista (local o entornos no Vercel).

Alternativas fuera de código (cohorte por hostname, filtro manual por dominio preview) son más frágiles.

---

## 3. Ventanas de funnel — la justificación original es incorrecta

Verificado: Stripe Checkout Sessions expiran a **24 horas por defecto** (rango configurable 30 min–24h vía `expires_at`) y no hay `expires_at` custom en `createAltaCheckoutSession`. Por tanto, la frase "14 días alineados con Stripe por defecto" era incorrecta.

Los 14 días pueden seguir siendo razonables por ciclo de decisión humano, pero no por comportamiento técnico de Stripe.

Recomendación: usar ventanas distintas por sub-funnel:

| Sub-funnel | Ventana | Motivo |
|---|---|---|
| `wizard_started` -> `alta_lead_saved` | 7–14 días | Decisión humana |
| `checkout_session_created` -> `alta_fulfilled` | 24–48h | Paso técnico acotado por Stripe |

---

## 4. Identidad y sesión

El merge anon -> `alta_id` es un punto de fallo silencioso clave.

**Confirmado por código:**
- `wizard_started` se captura en identidad anónima.
- `identify(alta_id)` ocurre después de `saveAlta`.

Riesgos:
- pestaña nueva: segundo `wizard_started` para la misma persona;
- cookies bloqueadas/ITP;
- fragmentación de sesión en flujos de redirect/popup.

**Precisión clave:** no todos los funnels dependen igual del merge.

- El funnel **cliente end-to-end** que arranca en `wizard_started` sí depende del merge anon->identificado.
- El funnel **servidor puro** `alta_lead_saved` -> `checkout_session_created` -> `alta_fulfilled` no depende de ese merge, porque ya usa `distinct_id: alta_id` en los tres pasos.

Antes de confiar en CVR global, comparar ambos funnels y cuantificar la divergencia.

**También confirmado:** `wizard_started` es 1x por pestaña (usa `sessionStorage`), no 1x por persona.

---

## 5. Lo que el código ya hace bien (para no re-investigar)

Idempotencia del webhook hacia PostHog: el sobreconteo por reintentos de Stripe no aparece en el flujo actual.

Orden real:
1. `fulfillAltaFromCheckout` (idempotente; `fulfilled` solo la primera vez).
2. `posthog.capture` solo cuando `outcome === "fulfilled"`.
3. Reintentos posteriores suelen caer en `already_fulfilled` y no vuelven a capturar.

**Riesgo inverso real:** si `fulfillAltaFromCheckout` ya fue OK pero `posthog.capture` falla en ese primer intento, los reintentos posteriores no corrigen el evento porque ya no entran en `fulfilled`. Resultado: `paid` en Neon sin `alta_fulfilled` en PostHog (subconteo silencioso).

**Matiz de entorno local:** `markAltaPaidMock` puede marcar `paid` en Neon sin emitir `alta_fulfilled`. En reconciliaciones, separar claramente producción de local/mock.

**Mitigación recomendada:** reconciliación periódica Neon (`status = 'paid'`) vs PostHog (`alta_fulfilled`) para el mismo rango temporal.

---

## 6. Otras correcciones menores (confirmadas por código)

| # | Punto | Confirmación |
|---|---|---|
| 8 | `management_fee` inactivo | `ENABLE_MANAGEMENT_FEE = false` en `alta-config.ts`; categoría hoy muerta |
| 9 | Gap contacto -> lead es ruidoso | `wizard_contact_submitted` se dispara antes de `saveAlta`; no es proxy limpio de fallos server |
| 10 | Riesgo de tiles duplicados | Ya existen varios insights en 792288; evitar reconstruirlos |
| 11 | Consent legal != consent analytics | `consent_user_agent` va a BD de términos; no gatea PostHog en cliente |

**Matiz adicional del gap contacto->lead:** además del retry tras error, un doble click o doble envío del formulario puede disparar `wizard_contact_submitted` más de una vez sin equivalencia 1:1 con `alta_lead_saved`.

---

## 7. Checklist actualizado — validar antes de confiar en cualquier CVR

- [ ] ¿El North Star distingue revenue real de trial 0 EUR?
- [ ] ¿Existe exclusión de entorno (`app_env`) o se reporta sin ella?
- [ ] ¿Se comparó funnel servidor puro vs funnel que arranca en `wizard_started`?
- [ ] ¿La ventana de conversión usada corresponde al sub-funnel medido?
- [ ] ¿Se reconciliaron Neon `paid` vs PostHog `alta_fulfilled`?
- [ ] ¿Se evita usar `wizard_contact_submitted - alta_lead_saved` como alerta automática?
- [ ] ¿Se verificó que el tile a crear no duplica uno existente en 792288?

---

## 8. Priorización de acciones

| Prioridad | Acción |
|---|---|
| P0 | Instrumentar `checkout_scenario`/`amount_due_today` en `alta_fulfilled` o formalizar join con Neon |
| P0 | Definir `app_env` global (con fallback `development`) para eventos cliente |
| P0 | Validar dependencia de merge comparando funnel servidor vs funnel cliente |
| P0 | Reconciliación periódica Neon `paid` vs PostHog `alta_fulfilled` |
| P1 | Corregir política de ventanas (14d vs 24–48h por sub-funnel) |
| P1 | Instrumentar evento del paso `brecha` |
| P2 | Revisar consentimiento analytics/replay con legal |
| P2 | Mapear tiles nuevos vs existentes antes de extender dashboard |
| P2 | Sustituir alertas del gap contacto->lead por señales de servidor |

---

## 9. Pre-lanzamiento — scope de `VITE_VERCEL_ENV`

Checklist operativo de despliegue (scope, redeploy, inventario de vars): **[DEPLOY.md](DEPLOY.md)** § Pasos one-time.

Resumen analítico:

| Scope | Comportamiento cliente (`app_env`) | Riesgo |
|---|---|---|
| Production + Preview | Preview emite eventos al proyecto PostHog canónico con `app_env: "preview"` | Contamina funnels/CVR de producción si no se filtra siempre |
| **Solo Production** | Solo builds de producción etiquetan `app_env: "production"` en cliente | Preview cliente → fallback `development`; separable en PostHog |

Pasos (detalle en DEPLOY.md):

1. Editar `VITE_VERCEL_ENV` y quitar Preview (y Development) del scope en el host.
2. Valor en Production: `production`.
3. **Redeploy Production** tras el cambio (la var es de build para Vite).

Los eventos servidor en preview siguen usando `VERCEL_ENV` nativo (`app_env: "preview"` vía `captureServerEvent`). Los dashboards de producción deben filtrar `app_env = production` o excluir `preview`/`development` explícitamente.

---

Este addendum no reemplaza `handoff-wizard-analytics.md`; lo acota. Cualquier definición de objetivos o diseño de dashboard debe pasar antes por los P0 de este documento.
