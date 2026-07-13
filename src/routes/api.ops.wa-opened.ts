import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { markWaOpened } from "@/lib/operations.server";

const AltaIdSchema = z.string().uuid();

export const Route = createFileRoute("/api/ops/wa-opened")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
