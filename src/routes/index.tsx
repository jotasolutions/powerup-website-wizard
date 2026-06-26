import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AsistenteAlta } from "@/components/asistente/AsistenteAlta";

const searchSchema = z.object({
  cancelado: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Alta de Página Web · PowerUp Menu" },
      {
        name: "description",
        content:
          "Crea la página web de tu restaurante en unos pasos con PowerUp Menu. Incluida en el Plan Pro Anual con 1 mes de prueba gratis.",
      },
      { property: "og:title", content: "Alta de Página Web · PowerUp Menu" },
      {
        property: "og:description",
        content:
          "Tu página web de restaurante lista en minutos. Incluida en el Plan Pro Anual con 1 mes de prueba gratis.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { cancelado } = Route.useSearch();
  return <AsistenteAlta recoverFromCancel={cancelado === "1"} />;
}
