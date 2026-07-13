import {
  envConfigHint,
  getBrevoApiKey,
  getBrevoSenderEmail,
  getBrevoSenderName,
  hasBrevoConfig,
} from "./env.server";

export type BrevoTransactionalEmail = {
  to: string;
  subject: string;
  htmlContent: string;
  templateId?: number;
  templateParams?: Record<string, string>;
};

let warnedMissingBrevo = false;

const BREVO_FETCH_TIMEOUT_MS = 10_000;

export async function sendBrevoTransactionalEmail(email: BrevoTransactionalEmail): Promise<boolean> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    if (!warnedMissingBrevo) {
      console.warn(
        JSON.stringify({
          event: "brevo_config_missing",
          hint: envConfigHint("BREVO_API_KEY"),
        }),
      );
      warnedMissingBrevo = true;
    }
    return false;
  }

  const body: Record<string, unknown> = {
    sender: {
      name: getBrevoSenderName(),
      email: getBrevoSenderEmail(),
    },
    to: [{ email: email.to }],
    subject: email.subject,
  };

  if (email.templateId != null) {
    body.templateId = email.templateId;
    body.params = email.templateParams ?? {};
  } else {
    body.htmlContent = email.htmlContent;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error(
        JSON.stringify({
          event: "brevo_send_failed",
          status: response.status,
          body: responseBody.slice(0, 300),
        }),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "brevo_send_error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Solo para tests: resetea flag de warning. */
export function resetBrevoClientForTests(): void {
  warnedMissingBrevo = false;
}

export { hasBrevoConfig };
