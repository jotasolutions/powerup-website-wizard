/**
 * Crea o actualiza plantillas transaccionales del wizard en Brevo.
 * Requiere BREVO_API_KEY en .env (ver docs/brevo-transactional-templates/README.md).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatesDir = resolve(root, "docs/brevo-transactional-templates");

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL?.trim() || "info@powerup.menu";
const SENDER_NAME = process.env.BREVO_SENDER_NAME?.trim() || "PowerUp Menu";

const TEMPLATES = [
  {
    key: "BREVO_TEMPLATE_CHECKOUT_PAID",
    name: "wizard-checkout-paid",
    htmlFile: "checkout-paid.html",
    subjectFile: "checkout-paid.subject.txt",
  },
  {
    key: "BREVO_TEMPLATE_CHECKOUT_TRIAL",
    name: "wizard-checkout-trial",
    htmlFile: "checkout-trial.html",
    subjectFile: "checkout-trial.subject.txt",
  },
  {
    key: "BREVO_TEMPLATE_CHECKOUT_UPGRADE",
    name: "wizard-checkout-upgrade",
    htmlFile: "checkout-upgrade.html",
    subjectFile: "checkout-upgrade.subject.txt",
  },
  {
    key: "BREVO_TEMPLATE_SITE_DELIVERED",
    name: "wizard-site-delivered",
    htmlFile: "site-delivered.html",
    subjectFile: "site-delivered.subject.txt",
  },
];

function readTemplateFile(filename) {
  return readFileSync(resolve(templatesDir, filename), "utf8").trim();
}

async function brevoFetch(path, options = {}) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta BREVO_API_KEY en .env");
  }

  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `Brevo ${options.method ?? "GET"} ${path} → ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }

  return body;
}

async function listTemplates() {
  const result = await brevoFetch("/smtp/templates?templateStatus=true&limit=100&sort=desc");
  return result.templates ?? [];
}

async function createTemplate({ name, subject, htmlContent }) {
  return brevoFetch("/smtp/templates", {
    method: "POST",
    body: JSON.stringify({
      templateName: name,
      subject,
      htmlContent,
      isActive: true,
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    }),
  });
}

async function updateTemplate(id, { name, subject, htmlContent }) {
  return brevoFetch(`/smtp/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      templateName: name,
      subject,
      htmlContent,
      isActive: true,
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    }),
  });
}

async function main() {
  console.log("Brevo — seed plantillas transaccionales del wizard\n");
  console.log(`Remitente: ${SENDER_NAME} <${SENDER_EMAIL}>\n`);

  const existing = await listTemplates();
  const byName = new Map(existing.map((t) => [t.name, t]));
  const envLines = [];

  for (const spec of TEMPLATES) {
    const htmlContent = readTemplateFile(spec.htmlFile);
    const subject = readTemplateFile(spec.subjectFile);
    const found = byName.get(spec.name);

    let templateId;
    if (found?.id) {
      await updateTemplate(found.id, {
        name: spec.name,
        subject,
        htmlContent,
      });
      templateId = found.id;
      console.log(`✓ Actualizada: ${spec.name} (id ${templateId})`);
    } else {
      const created = await createTemplate({
        name: spec.name,
        subject,
        htmlContent,
      });
      templateId = created.id;
      console.log(`✓ Creada: ${spec.name} (id ${templateId})`);
    }

    envLines.push(`${spec.key}=${templateId}`);
  }

  console.log("\nCopia esto a tu .env:\n");
  console.log(envLines.join("\n"));
  console.log("\nListo.");
}

main().catch((error) => {
  console.error("\nError:", error instanceof Error ? error.message : error);
  process.exit(1);
});
