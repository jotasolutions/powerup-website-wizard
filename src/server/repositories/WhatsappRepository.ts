import {
  getEvolutionApiKey,
  getEvolutionApiUrl,
  getEvolutionInstanceName,
} from "@/lib/env.server";

export default class WhatsappRepository {
  static async doesWhatsappNumExists(phone: string): Promise<boolean> {
    const url = `${getEvolutionApiUrl()}/chat/whatsappNumbers/${getEvolutionInstanceName()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: getEvolutionApiKey() ?? "",
      },
      body: JSON.stringify({
        numbers: [phone],
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error("Evolution error: " + data.response.message);
    }

    return data[0].exists;
  }
}
