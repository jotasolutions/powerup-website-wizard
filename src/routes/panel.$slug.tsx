import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { InternalPanelPage } from "@/components/analytics/InternalPanelPage";
import { PanelLogin } from "@/components/analytics/PanelLogin";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";
import { getPanelSession, logoutPanel } from "@/lib/panel-auth.functions";

type PanelTab = "diagnostico" | "operaciones";

const panelSearchSchema = z.object({
  tab: z.enum(["diagnostico", "operaciones"]).optional().default("diagnostico"),
});

function parsePanelSearch(search: Record<string, unknown>): { tab: PanelTab } {
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
    meta: [{ title: "Diagnóstico Alta · PowerUp" }, { name: "robots", content: "noindex" }],
  }),
  component: PanelRoute,
});

function PanelRoute() {
  const { tab } = Route.useSearch();
  const getPanelSessionFn = useServerFn(getPanelSession);
  const logoutPanelFn = useServerFn(logoutPanel);
  // Los datos del panel solo se piden con sesión; las funciones del servidor lo comprueban igual.
  const session = useQuery({
    queryKey: ["panel-session"],
    queryFn: () => getPanelSessionFn(),
    staleTime: 0,
  });

  if (session.isPending) return <div className="panel-shell min-h-screen" />;

  if (!session.data?.authorized) {
    return (
      <PanelLogin
        state={session.data?.state ?? "locked"}
        onLoggedIn={() => void session.refetch()}
      />
    );
  }

  return (
    <InternalPanelPage
      tab={tab}
      onLogout={
        session.data.state === "required"
          ? async () => {
              await logoutPanelFn();
              await session.refetch();
            }
          : undefined
      }
    />
  );
}
