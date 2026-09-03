import { NextResponse } from "next/server";
import { storeInboundWhatsApp } from "@/lib/whatsappInbox";

export const dynamic = "force-dynamic";

function verifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { filename?: string; caption?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};

type MetaValue = {
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: MetaMessage[];
};

function inboundBody(msg: MetaMessage): string {
  if (msg.type === "text" && msg.text?.body) return msg.text.body;
  if (msg.type === "image") {
    return msg.image?.caption ? `[תמונה] ${msg.image.caption}` : "[תמונה]";
  }
  if (msg.type === "video") {
    return msg.video?.caption ? `[וידאו] ${msg.video.caption}` : "[וידאו]";
  }
  if (msg.type === "audio") return "[שמע]";
  if (msg.type === "document") {
    const name = msg.document?.filename || msg.document?.caption;
    return name ? `[קובץ] ${name}` : "[קובץ]";
  }
  if (msg.type === "sticker") return "[מדבקה]";
  if (msg.type === "location") return "[מיקום]";
  if (msg.type === "contacts") return "[איש קשר]";
  if (msg.type === "button" && msg.button?.text) return msg.button.text;
  if (msg.type === "interactive") {
    const reply =
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title;
    return reply || "[תשובה]";
  }
  return `[${msg.type || "הודעה"}]`;
}

/** Meta Cloud API handshake — return raw challenge as plain text. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = verifyToken();

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/** Store inbound WhatsApp messages for the matching clinic inbox. */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      entry?: Array<{ changes?: Array<{ value?: MetaValue }> }>;
    };
    const values =
      payload.entry?.flatMap((entry) =>
        (entry.changes || []).map((change) => change.value).filter(Boolean),
      ) || [];

    for (const value of values) {
      const contactName = value?.contacts?.[0]?.profile?.name || "";
      for (const msg of value?.messages || []) {
        if (!msg.from || !msg.id) continue;
        const at = msg.timestamp
          ? new Date(Number(msg.timestamp) * 1000)
          : new Date();
        await storeInboundWhatsApp({
          from: msg.from,
          body: inboundBody(msg),
          metaId: msg.id,
          contactName,
          at,
        });
      }
    }
  } catch {
    /* still ack so Meta does not retry endlessly */
  }

  return new NextResponse(null, { status: 200 });
}
