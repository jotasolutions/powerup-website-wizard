import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { markWaOpened } from "@/lib/operations.server";
import {
  PANEL_SESSION_COOKIE,
  isPanelSessionAuthorized,
  readCookie,
} from "@/lib/panel-auth.server";

const AltaIdSchema = z.string().uuid();

export const Route = createFileRoute("/api/ops/wa-opened")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Solo desde el panel, con sesión válida.
        const session = readCookie(request.headers.get("cookie"), PANEL_SESSION_COOKIE);
        if (!isPanelSessionAuthorized(session)) {
          return new Response(null, { status: 401 });
        }

        const url = new URL(request.url);
        let altaId = url.searchParams.get("altaId");

        if (!altaId) {
          try {
            const body = (await request.json()) as { altaId?: string };
            altaId = body.altaId ?? null;
          } catch {
            return new Response(null, { status: 400 });
          }
        }

        const parsed = AltaIdSchema.safeParse(altaId);
        if (!parsed.success) {
          return new Response(null, { status: 400 });
        }

        await markWaOpened(parsed.data);
        return new Response(null, { status: 204 });
      },
    },
  },
});
