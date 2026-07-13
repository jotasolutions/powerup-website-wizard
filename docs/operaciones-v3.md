# Operaciones v3 — panel interno

Especificación del tab **Operaciones** en `/panel/$slug?tab=operaciones`.

Referencia visual: [referencia-diseno-operaciones-v3.html](./referencia-diseno-operaciones-v3.html)

## Principio

Registrar, no gestionar. Cada interacción deja timestamp (pago, dominio registrado, entrega, WhatsApp abierto, nota). Sin workflows de archivado en v1.

## Estructura

1. **Entrega** — kanban 3 columnas, sin filtro de fechas: Dominio por registrar · Construyendo · Entregada (10 recientes + «ver todas»).
2. **Leads** — lista 14 días, 2 grupos: Para reenganchar / Recientes — en curso. Línea de resultado fija 30 días.
3. **Histórico** — «ver histórico (N)» con N = total de leads; buscador cliente; columna Desenlace.

## Umbrales (`src/lib/ops-config.ts`)

| Constante | Valor | Uso |
|-----------|-------|-----|
| `OPS_CHECKOUT_ABANDON_HOURS` | 48 | Chip «dejó el pago» |
| `OPS_STALLED_DAYS` | 3 | Chip «parado N días» |
| `OPS_LEADS_ACTIVE_DAYS` | 14 | Ventana lista de trabajo |
| `OPS_RESULT_LINE_DAYS` | 30 | Línea de resultado |
| `OPS_COOLED_DAYS` | 14 | Desenlace «se enfrió» |
| `OPS_DOMAIN_OVERDUE_DAYS` | 3 | Dominio atrasado en Entrega |

## Derivación (`src/lib/ops-derive.ts`)

- **Activó ✓**: `status = 'paid'` (no `paid_at`).
- **Dejó el pago**: pending + `checkout_started_at` + >48 h.
- **Parado N días**: pending + sin checkout + >3 d.
- **Se enfrió**: pending + sin checkout + >14 d.
- **En curso**: pending activo sin desenlace terminal (checkout <48 h, legacy con solo `stripe_session_id`, etc.).
- Legacy `stripe_session_id` sin `checkout_started_at`: con checkout, sin chip temporal.
- Reintento checkout reinicia reloj 48 h (sin memoria del primer checkout).
- `ops_status`: deprecado; board solo timestamps.

## Datos

- Único campo nuevo: `wa_opened_at` (silencioso, sin UI v1).
- CSV: histórico completo, columnas `desenlace` + `estado` (fase entrega si pagado).

## Tests

`src/lib/ops-derive.test.ts` — 12 casos (ambiguos 1–12, incl. desenlace «en curso» nunca vacío).
