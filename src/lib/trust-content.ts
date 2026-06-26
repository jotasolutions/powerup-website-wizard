/** Etiqueta fija de la cinta de autoridad (checkout paso resumen). */
export const TRUST_RIBBON_LABEL = "Prensa y aceleradoras que nos valoran";

/** Nombres que rotan en la cinta — editar aquí sin tocar el componente. */
export const TRUST_MARQUEE_NAMES = [
  "Lanzadera",
  "Startup Valencia",
  "Órbita",
  "Profesional Horeca",
] as const;

export function buildTrustMarqueeSegment(): string {
  return TRUST_MARQUEE_NAMES.join(" · ");
}
