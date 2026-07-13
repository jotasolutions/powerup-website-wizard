import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNeonEnvFilterStatus } from "./neon-env-filter.server";
import {
  getOperationsBoard,
  getOperationsCsvRows,
  markDelivered,
  markDomainRegistered,
  markWaOpened,
  updateOpsNotes,
} from "./operations.server";

const OpsInput = z.object({
  appEnv: z.enum(["production", "all"]).default("production"),
});

export const fetchOperationsBoard = createServerFn({ method: "GET" })
  .validator((input: unknown) => OpsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const neonEnvStatus = await getNeonEnvFilterStatus();
    return getOperationsBoard(data.appEnv, neonEnvStatus.columnReady);
  });

export const saveOpsNotes = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ altaId: z.string().uuid(), notes: z.string().nullable() }).parse(input),
  )
  .handler(async ({ data }) => {
    await updateOpsNotes(data.altaId, data.notes);
    return { ok: true as const };
  });

export const setDomainRegistered = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ altaId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await markDomainRegistered(data.altaId);
    return { ok: true as const };
  });

export const setDelivered = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ altaId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await markDelivered(data.altaId);
    return { ok: true as const };
  });

export const markWaOpenedFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ altaId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await markWaOpened(data.altaId);
    return { ok: true as const };
  });

export const exportOperationsCsv = createServerFn({ method: "GET" })
  .validator((input: unknown) => OpsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const neonEnvStatus = await getNeonEnvFilterStatus();
    const rows = await getOperationsCsvRows(data.appEnv, neonEnvStatus.columnReady);
    const header = [
      "fecha",
      "restaurante",
      "contacto",
      "teléfono",
      "email",
      "tipo_dominio",
      "dominio",
      "importe",
      "desenlace",
      "estado",
      "dominio_registrado",
      "entregada",
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.fecha,
          r.restaurante,
          r.contacto,
          r.telefono,
          r.email,
          r.tipoDominio,
          r.dominio,
          r.importe,
          r.desenlace,
          r.estado,
          r.dominioRegistrado,
          r.entregada,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    const csv = `\uFEFF${lines.join("\n")}`;
    return { csv, filename: "operaciones-altas.csv" };
  });

export type OperationsBoardPayload = Awaited<ReturnType<typeof getOperationsBoard>>;
