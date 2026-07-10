import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { InternalPanelPage } from "@/components/analytics/InternalPanelPage";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";

const panelSearchSchema = z.object({
  tab: z.enum(["diagnostico", "operaciones"]).optional().default("diagnostico"),
});

export const Route = createFileRoute("/panel/$slug")({
  validateSearch: (search) => panelSearchSchema.parse(search),
  beforeLoad: ({ params }) => {
    if (params.slug !== DEFAULT_ANALYTICS_PANEL_SLUG) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ search }) => ({
    meta: [
      {
        title:
          search.tab === "operaciones"
            ? "Operaciones · PowerUp"
            : "Diagnóstico Alta · PowerUp",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PanelRoute,
});

function PanelRoute() {
  const { tab } = Route.useSearch();
  return <InternalPanelPage tab={tab} />;
}
