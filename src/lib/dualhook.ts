import { toWhatsAppDigits } from "@/lib/phone";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function dualhookConfigured() {
  return Boolean(env("DUALHOOK_API_KEY") && env("DUALHOOK_PHONE_NUMBER_ID"));
}

function templateName() {
  return env("DUALHOOK_TEMPLATE_NAME") || "hello_world";
}

function templateLanguage() {
  if (env("DUALHOOK_TEMPLATE_LANGUAGE")) return env("DUALHOOK_TEMPLATE_LANGUAGE");
  return templateName() === "hello_world" ? "en_US" : "he";
}

function templateParamCount() {
  const raw = env("DUALHOOK_TEMPLATE_BODY_PARAMS");
  if (raw === "0" || raw === "1" || raw === "2") return Number(raw);
  return templateName() === "hello_world" ? 0 : 2;
}

function sanitizeParam(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return (cleaned || "-").slice(0, 1024);
}

export async function sendDualhookTemplate(input: {
  to: string;
  name: string;
  body: string;
}) {
  const key = env("DUALHOOK_API_KEY");
  const phoneId = env("DUALHOOK_PHONE_NUMBER_ID");
  const digits = toWhatsAppDigits(input.to);
  if (!key || !phoneId) {
    return { ok: false as const, error: "NOT_CONFIGURED" };
  }
  if (!digits) {
    return { ok: false as const, error: "PHONE_INVALID" };
  }

  const name = templateName();
  const paramCount = templateParamCount();
  const params = [sanitizeParam(input.name), sanitizeParam(input.body)];
  const template: Record<string, unknown> = {
    name,
    language: { code: templateLanguage() },
  };
  if (paramCount > 0) {
    template.components = [
      {
        type: "body",
        parameters: params.slice(0, paramCount).map((text) => ({
          type: "text",
          text,
        })),
      },
    ];
  }

  const res = await fetch(
    `https://api.dualhook.com/v25.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "template",
        template,
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; error_user_msg?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    return {
      ok: false as const,
      error:
        data.error?.error_user_msg ||
        data.error?.message ||
        `HTTP_${res.status}`,
    };
  }

  return { ok: true as const, id: data.messages?.[0]?.id || "" };
}
