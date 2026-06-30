import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AsistenteAlta } from "@/components/asistente/AsistenteAlta";
import { ALTA_SEO_DESCRIPTION, ALTA_SEO_OG_DESCRIPTION } from "@/lib/alta-copy";

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
        content: ALTA_SEO_DESCRIPTION,
      },
      { property: "og:title", content: "Alta de Página Web · PowerUp Menu" },
      {
        property: "og:description",
        content: ALTA_SEO_OG_DESCRIPTION,
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { cancelado } = Route.useSearch();
  return <AsistenteAlta recoverFromCancel={cancelado === "1"} />;
}
