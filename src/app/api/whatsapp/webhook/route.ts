import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function verifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

/** Meta / Dualhook handshake — return raw challenge as plain text. */
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

/** Ack inbound WhatsApp events. Do not store message bodies. */
export async function POST() {
  return new NextResponse(null, { status: 200 });
}
