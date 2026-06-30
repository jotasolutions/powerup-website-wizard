import type { WebsiteType } from "./place-profile.types";

export const PLACE_GAP_PLATFORM_PLACEHOLDER = "{plataforma}";

/** Frases de brecha por website_type — editar aquí sin tocar la lógica. */
export const PLACE_GAP_MESSAGES = {
  none: "Hoy en internet casi no apareces. Te montamos una web conectada con tu Google y tu carta, que es justo lo que hace que te encuentren — incluso cuando la gente le pregunta a la IA dónde comer. Y la hacemos nosotros, tú no tocas nada.",
  builder:
    "Tu web de ahora va por su lado, separada de tu Google y tu carta. La nuestra lo une todo, que es lo que hace que te encuentren — también cuando le preguntan a la IA dónde comer. Y la montamos nosotros, tú no tocas nada.",
  aggregator: `Tu enlace lleva a ${PLACE_GAP_PLATFORM_PLACEHOLDER}, que no está conectado a nada. Te hacemos una web unida a tu Google y tu carta — así es como la gente y hasta la IA dan contigo. Nos encargamos de todo.`,
  social: `Tu ${PLACE_GAP_PLATFORM_PLACEHOLDER} va por libre. Te montamos una web de verdad, conectada con tu Google y tu carta, que es lo que hace que aparezcas cuando buscan dónde comer. Sin que te ocupes de nada.`,
  own: "Ya tienes web, pero va por su lado, sin conectar con tu Google ni tu carta. La nuestra lo une todo, que es lo que hace que te encuentren hoy — también cuando le preguntan a la IA dónde comer. Y no tienes que mantener nada.",
} as const satisfies Record<WebsiteType, string>;

/** Respaldo aggregator cuando no se identifica la marca concreta. */
export const PLACE_GAP_AGGREGATOR_GENERIC =
  "Tu enlace lleva a una página que no está conectada a nada. Te hacemos una web unida a tu Google y tu carta — así es como la gente y hasta la IA dan contigo. Nos encargamos de todo.";

/** Respaldo social cuando no se identifica la marca concreta. */
export const PLACE_GAP_SOCIAL_GENERIC =
  "Tu red social va por libre. Te montamos una web de verdad, conectada con tu Google y tu carta, que es lo que hace que aparezcas cuando buscan dónde comer. Sin que te ocupes de nada.";

/** Brecha para clientes que ya tienen carta PowerUp Menu (upgrade a página web). */
export const PLACE_GAP_POWERUP_UPGRADE =
  "Ya tienes la carta con PowerUp Menu. Te montamos la página web conectada con tu Google y esa misma carta — así te encuentran cuando buscan (y cuando preguntan a la IA). Nosotros lo activamos; tú no empiezas de cero.";

export function resolvePowerUpUpgradeMessage(): string {
  return PLACE_GAP_POWERUP_UPGRADE;
}
