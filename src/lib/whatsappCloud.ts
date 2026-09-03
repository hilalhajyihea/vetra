import { toCloudRecipient, toWhatsAppDigits } from "@/lib/phone";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function accessToken() {
  return env("WHATSAPP_ACCESS_TOKEN") || env("META_WHATSAPP_TOKEN");
}

function phoneNumberId() {
  return env("WHATSAPP_PHONE_NUMBER_ID");
}

function graphVersion() {
  return env("WHATSAPP_GRAPH_VERSION") || "v21.0";
}

export function whatsappConfigured() {
  return Boolean(accessToken() && phoneNumberId());
}

function templateName() {
  return env("WHATSAPP_TEMPLATE_NAME") || "hello_world";
}

function templateLanguage() {
  if (env("WHATSAPP_TEMPLATE_LANGUAGE")) return env("WHATSAPP_TEMPLATE_LANGUAGE");
  return templateName() === "hello_world" ? "en_US" : "he";
}

function templateParamCount() {
  const raw = env("WHATSAPP_TEMPLATE_BODY_PARAMS");
  if (raw === "0" || raw === "1" || raw === "2") return Number(raw);
  return templateName() === "hello_world" ? 0 : 1;
}

function sanitizeParam(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return (cleaned || "-").slice(0, 1024);
}

export async function sendWhatsAppTemplate(input: {
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
  const filled = sanitizeParam(input.body);
  const params =
    paramCount <= 1
      ? [filled]
      : [sanitizeParam(input.name), filled];
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
    `https://graph.facebook.com/${graphVersion()}/${phoneId}/messages`,
    {
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
    },
  );

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

export async function sendWhatsAppText(input: { to: string; body: string }) {
  const token = accessToken();
  const phoneId = phoneNumberId();
  const digits = toCloudRecipient(input.to);
  if (!token || !phoneId) {
    return { ok: false as const, error: "NOT_CONFIGURED" };
  }
  if (!digits) {
    return { ok: false as const, error: "PHONE_INVALID" };
  }
  const text = input.body.replace(/[ \t]+\n/g, "\n").trim().slice(0, 4096);
  if (!text) {
    return { ok: false as const, error: "EMPTY" };
  }

  const res = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: text },
      }),
    },
  );

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
