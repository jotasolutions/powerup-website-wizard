import {
  getEvolutionApiKey,
  getEvolutionApiUrl,
  getEvolutionInstanceName,
} from "@/lib/env.server";

type WhatsappCheckResult = {
  exists?: boolean;
  number?: string;
};

export default class WhatsappRepository {
  static async doesWhatsappNumExists(phone: string): Promise<boolean> {
    const url = `${getEvolutionApiUrl()}/chat/whatsappNumbers/${getEvolutionInstanceName()}`;
    const apiKey = getEvolutionApiKey();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey ?? "",
      },
      body: JSON.stringify({
        numbers: [phone],
      }),
    });

    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        raw && typeof raw === "object" && "message" in raw
          ? String((raw as { message: unknown }).message)
          : response.statusText;
      throw new Error(`Evolution HTTP ${response.status}: ${message}`);
    }

    if (raw && typeof raw === "object" && "error" in raw) {
      const err = raw as { response?: { message?: string }; message?: string };
      const message = err.response?.message ?? err.message ?? "unknown Evolution error";
      throw new Error(`Evolution error: ${message}`);
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("Evolution devolvió una respuesta inesperada al comprobar WhatsApp.");
    }

    const first = raw[0] as WhatsappCheckResult;
    return first.exists === true;
  }
}
