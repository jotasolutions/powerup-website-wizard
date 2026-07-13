/** Umbrales del panel Operaciones v3 — ver docs/referencia-diseno-operaciones-v3.html */

/** Horas sin activar tras iniciar checkout → chip «dejó el pago». */
export const OPS_CHECKOUT_ABANDON_HOURS = 48;

/** Días sin checkout → chip «parado N días» y grupo reenganchar. */
export const OPS_STALLED_DAYS = 3;

/** Ventana de la lista de trabajo (leads activos). */
export const OPS_LEADS_ACTIVE_DAYS = 14;

/** Ventana de la línea de resultado sobre la lista. */
export const OPS_RESULT_LINE_DAYS = 30;

/** Días sin checkout en histórico → desenlace «se enfrió». */
export const OPS_COOLED_DAYS = 14;

/** Días desde pago sin registrar dominio custom → atrasado en Entrega. */
export const OPS_DOMAIN_OVERDUE_DAYS = 3;

/** Tarjetas visibles en columna Entregada antes de «ver todas». */
export const OPS_DELIVERED_PREVIEW = 10;

export const MS_HOUR = 60 * 60 * 1000;
export const MS_DAY = 24 * MS_HOUR;

/** Tooltip v1 (atributo title) del chip «dejó el pago». */
export function opsChipPaymentLeftTitle(): string {
  return `Llegó a la pantalla de pago de Stripe y la abandonó hace más de ${OPS_CHECKOUT_ABANDON_HOURS} h — lead caliente, mensaje de cierre`;
}

/** Tooltip v1 (atributo title) del chip «parado N días». */
export const OPS_CHIP_STALLED_TITLE =
  "Dejó su contacto pero nunca llegó al pago — retomar conversación, no cerrar venta";

/** Leyenda bajo el grupo «Para reenganchar» (umbrales interpolados). */
export function opsReengageGroupLegend(): string {
  return `dejó el pago = llegó a la pantalla de pago y la abandonó (>${OPS_CHECKOUT_ABANDON_HOURS} h) · parado = nunca llegó al pago (>${OPS_STALLED_DAYS} días)`;
}
