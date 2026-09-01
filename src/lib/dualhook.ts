import { toWhatsAppDigits } from "@/lib/phone";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function metaToken() {
  return env("WHATSAPP_ACCESS_TOKEN") || env("META_WHATSAPP_TOKEN");
}

function dualhookKey() {
  return env("DUALHOOK_API_KEY");
}

function phoneNumberId() {
  return env("WHATSAPP_PHONE_NUMBER_ID") || env("DUALHOOK_PHONE_NUMBER_ID");
}

function accessToken() {
  return metaToken() || dualhookKey();
}

function useMetaDirect() {
  return Boolean(metaToken());
}

function graphVersion() {
  return env("WHATSAPP_GRAPH_VERSION") || "v21.0";
}

export function dualhookConfigured() {
  return Boolean(accessToken() && phoneNumberId());
}

function templateName() {
  return (
    env("WHATSAPP_TEMPLATE_NAME") ||
    env("DUALHOOK_TEMPLATE_NAME") ||
    "hello_world"
  );
}

function templateLanguage() {
  const explicit =
    env("WHATSAPP_TEMPLATE_LANGUAGE") || env("DUALHOOK_TEMPLATE_LANGUAGE");
  if (explicit) return explicit;
  return templateName() === "hello_world" ? "en_US" : "he";
}

function templateParamCount() {
  const raw =
    env("WHATSAPP_TEMPLATE_BODY_PARAMS") || env("DUALHOOK_TEMPLATE_BODY_PARAMS");
  if (raw === "0" || raw === "1" || raw === "2") return Number(raw);
  return templateName() === "hello_world" ? 0 : 2;
}

function sanitizeParam(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return (cleaned || "-").slice(0, 1024);
}

function messagesUrl(phoneId: string) {
  if (useMetaDirect()) {
    return `https://graph.facebook.com/${graphVersion()}/${phoneId}/messages`;
  }
  return `https://api.dualhook.com/v25.0/${phoneId}/messages`;
}

export async function sendDualhookTemplate(input: {
  to: string;
  name: string;
  body: string;
}) {
  const token = accessToken();
  const phoneId = phoneNumberId();
  const digits = toWhatsAppDigits(input.to);
  if (!token || !phoneId) {
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

  const res = await fetch(messagesUrl(phoneId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "template",
      template,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: {
      message?: string;
      error_user_msg?: string;
      code?: number;
    };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    const detail =
      data.error?.error_user_msg ||
      data.error?.message ||
      `HTTP_${res.status}`;
    const code = data.error?.code;
    return {
      ok: false as const,
      error: code ? `(#${code}) ${detail}` : detail,
    };
  }

  return { ok: true as const, id: data.messages?.[0]?.id || "" };
}
