# Plantillas transaccionales Brevo — PowerUp Menu Wizard

Correos del flujo de alta. El servidor envía estos templates vía API (`/v3/smtp/email`) con `templateId` + `params`.

## Plantillas

| Archivo | Variable `.env` | Cuándo |
|---------|-----------------|--------|
| `checkout-paid.html` | `BREVO_TEMPLATE_CHECKOUT_PAID` | Cobro hoy (dominio, fee gestión) |
| `checkout-trial.html` | `BREVO_TEMPLATE_CHECKOUT_TRIAL` | Subdominio gratis + 30 días prueba |
| `checkout-upgrade.html` | `BREVO_TEMPLATE_CHECKOUT_UPGRADE` | Cliente carta PowerUp sin trial |
| `site-delivered.html` | `BREVO_TEMPLATE_SITE_DELIVERED` | Web marcada entregada en panel ops |

## Parámetros (`params`)

### Checkout paid
`contactName`, `restaurantName`, `amount`, `domainNextStep`, `supportWhatsAppLink`

### Checkout trial
`contactName`, `restaurantName`, `domainNextStep`, `supportWhatsAppLink`, `trialDays` (30)

### Checkout upgrade
`contactName`, `restaurantName`, `domainNextStep`, `supportWhatsAppLink`

### Site delivered
`contactName`, `restaurantName`, `pageUrl`, `supportWhatsAppLink`, `trialLine` (vacío en upgrades)

## Crear en Brevo

### Opción A — script (recomendado)

Con `BREVO_API_KEY` en `.env`:

```bash
npm run brevo:seed-templates
```

Crea o actualiza las plantillas y muestra los IDs para copiar al `.env`.

### Opción B — manual

1. [Brevo → Transactional → Templates](https://app.brevo.com/transactional/email/templates)
2. Nueva plantilla → pegar HTML y asunto de cada fichero
3. Remitente: `info@powerup.menu` / PowerUp Menu
4. Copiar IDs a `.env`

## Sin plantillas en Brevo

Si faltan los `BREVO_TEMPLATE_*`, el servidor envía **HTML generado en código** (`src/lib/alta-email.ts`). Solo necesitas `BREVO_API_KEY` y remitente verificado.

## Webhook de rebotes

En Brevo → Transactional → Settings → Webhooks, crea un webhook de eventos salientes:

- URL: `https://tu-dominio/api/brevo/webhook?token=TU_TOKEN`
- Eventos: hard bounce, soft bounce, invalid email, blocked, error
- `.env`: `BREVO_WEBHOOK_TOKEN=TU_TOKEN` (mismo valor)

Local con `stripe listen`-style tunnel: usa ngrok/cloudflared hacia `localhost:8080/api/brevo/webhook?token=…`

Al rebotar un email, el wizard marca `customer_email_bounced_at` y avisa por Slack con datos del alta + WhatsApp del cliente.

## Prueba local

```bash
BREVO_DEV_OVERRIDE_EMAIL=tu@email.com
```

Útil con mock checkout (sin email de Stripe).
