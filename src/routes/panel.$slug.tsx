import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { InternalPanelPage } from "@/components/analytics/InternalPanelPage";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";

const panelSearchSchema = z.object({
  tab: z.enum(["diagnostico", "operaciones"]).optional().default("diagnostico"),
});

function parsePanelSearch(search: Record<string, unknown>) {
  const parsed = panelSearchSchema.safeParse(search);
  if (parsed.success) return parsed.data;
  const tab = search.tab;
  if (tab === "operaciones" || tab === "diagnostico") {
    return { tab };
  }
  return { tab: "diagnostico" as const };
}

export const Route = createFileRoute("/panel/$slug")({
  validateSearch: (search) => parsePanelSearch(search as Record<string, unknown>),
  beforeLoad: ({ params }) => {
    if (params.slug !== DEFAULT_ANALYTICS_PANEL_SLUG) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Diagnóstico Alta · PowerUp" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PanelRoute,
});

function PanelRoute() {
  const { tab } = Route.useSearch();
  return <InternalPanelPage tab={tab} />;
}
