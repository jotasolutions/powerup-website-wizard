<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the PowerUp website wizard. The project already had `PostHogProvider` in the root shell (`__root.tsx`), a Vite/Nitro reverse proxy routing `/ingest` to the EU cluster, a singleton `posthog-node` server client, and 12 existing tracked events covering the full signup funnel. This run supplemented that foundation with four new targeted events filling the remaining gaps: manual domain searches in the custom-domain picker, restaurant search errors, server-side lead creation, and server-side Stripe checkout session creation.

## Events added in this run

| Event name | Description | File |
|---|---|---|
| `wizard_domain_checked_manually` | User manually searched for a custom domain and received an availability result. | `src/components/asistente/StepElegirDominio.tsx` |
| `wizard_restaurant_search_error` | An error occurred while searching for restaurants via Google Maps. | `src/components/asistente/AsistenteAlta.tsx` |
| `alta_lead_saved` | A lead was persisted to the database before the payment step (server-side). | `src/lib/alta.functions.ts` |
| `checkout_session_created` | A Stripe checkout session was successfully created for a sign-up (server-side). | `src/lib/alta.functions.ts` |

## Previously existing events (for reference)

| Event name | Description | File |
|---|---|---|
| `wizard_started` | Wizard opened for the first time in the session. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_restaurant_selected` | User picked a restaurant from Google Maps results. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_restaurant_entered_manually` | User entered restaurant name manually. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_place_confirmed` | User confirmed restaurant info is correct. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_domain_type_chosen` | User picked free subdomain or custom domain. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_custom_domain_selected` | User selected a specific available custom domain. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_order_reviewed` | User reviewed the order summary and continued. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_contact_submitted` | User submitted name and WhatsApp number. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_checkout_started` | User was redirected to Stripe Checkout. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_checkout_cancelled_recovered` | User returned after abandoning Stripe Checkout. | `src/components/asistente/AsistenteAlta.tsx` |
| `wizard_confirmed` | User landed on the confirmation page after checkout. | `src/routes/confirmacion.tsx` |
| `alta_fulfilled` | Stripe webhook fulfilled the sign-up (payment confirmed). | `src/lib/stripe-webhook.server.ts` |

## Files changed in this run

| File | Change |
|---|---|
| `src/components/asistente/StepElegirDominio.tsx` | Added `usePostHog`, `wizard_domain_checked_manually` capture with result and price/alternatives_count. Also fixed pre-existing curly-quote parse errors in the file. |
| `src/components/asistente/AsistenteAlta.tsx` | Added `wizard_restaurant_search_error` capture via useEffect monitoring the search error state. |
| `src/lib/alta.functions.ts` | Added `alta_lead_saved` capture in `saveAlta` and `checkout_session_created` capture in `createCheckout`, both using the `getPostHogClient()` singleton. |
| `.env` | Set correct values for `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST`. |

## Next steps

We've built a dashboard and five insights to monitor the sign-up funnel:

- [Dashboard — Analytics basics (wizard)](https://eu.posthog.com/project/212884/dashboard/792288)
- [Wizard conversion funnel (wizard)](https://eu.posthog.com/project/212884/insights/9pStaAbZ) — 4-step ordered funnel from wizard start to alta fulfilled
- [Wizard starts vs altas completadas (wizard)](https://eu.posthog.com/project/212884/insights/EsSyQKmW) — weekly trend comparing wizard starts and completed sign-ups
- [Elección de tipo de dominio (wizard)](https://eu.posthog.com/project/212884/insights/1lr3oKW7) — free subdomain vs custom domain split
- [Tasa de checkout completado (wizard)](https://eu.posthog.com/project/212884/insights/VAnIwzJn) — ratio of fulfilled altas to checkout sessions started
- [Recuperaciones de checkout cancelado (wizard)](https://eu.posthog.com/project/212884/insights/xh9cKUvK) — users who returned after abandoning Stripe

## Funnel: qué evento usar

| Paso funnel | Evento recomendado (cliente) | Alternativa servidor |
|-------------|------------------------------|----------------------|
| Entrada | `wizard_started` | — |
| Lead guardado | `wizard_contact_submitted` | `alta_lead_saved` |
| Checkout | `wizard_checkout_started` | `checkout_session_created` |
| Pago confirmado | `alta_fulfilled` | — |

Identidad: `identify(alta_id)` en `identifyAltaLead` tras `saveAlta` y en `recoverFromCancel` (`AsistenteAlta.tsx`). WhatsApp solo como propiedad de persona, nunca como `distinct_id`.

## Verify before merging

- [x] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [x] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to Vercel's Environment Variables (Settings → Environment Variables → Production) so events are captured in production.
- [ ] Wire source-map upload into CI so production stack traces de-minify in PostHog error tracking.
- [x] Returning-visitor path calls `identify(alta_id)` via `recoverFromCancel` when hay draft con `alta_id`; no se usa WhatsApp como identificador.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
