import { createFileRoute, redirect } from "@tanstack/react-router";
import { InternalAnalyticsDashboard } from "@/components/analytics/InternalAnalyticsDashboard";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";

export const Route = createFileRoute("/panel/$slug")({
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
  component: InternalAnalyticsDashboard,
});
