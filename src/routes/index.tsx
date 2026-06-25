import { createFileRoute } from "@tanstack/react-router";
import { AsistenteAlta } from "@/components/asistente/AsistenteAlta";

export const Route = createFileRoute("/")({
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
  return <AsistenteAlta />;
}
