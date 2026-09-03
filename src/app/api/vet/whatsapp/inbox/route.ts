import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { sendWhatsAppText, whatsappConfigured } from "@/lib/whatsappCloud";
import {
  recordThreadMessage,
  windowOpen,
} from "@/lib/whatsappInbox";
import {
  recordSuccessfulWhatsAppSend,
  whatsappQuotaFor,
} from "@/lib/whatsappQuota";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeThread(thread: {
  id: string;
  phone: string;
  contactName: string;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  lastPreview: string;
  unreadCount: number;
  breeder: {
    firstName: string;
    lastName: string;
    farmName: string;
  } | null;
}) {
  const name = thread.breeder
    ? `${thread.breeder.firstName} ${thread.breeder.lastName}`.trim()
    : thread.contactName;
  return {
    id: thread.id,
    phone: thread.phone,
    name: name || thread.phone,
    farmName: thread.breeder?.farmName || "",
    lastMessageAt: thread.lastMessageAt.toISOString(),
    lastInboundAt: thread.lastInboundAt?.toISOString() || null,
    lastPreview: thread.lastPreview,
    unreadCount: thread.unreadCount,
    windowOpen: windowOpen(thread.lastInboundAt),
  };
}

export async function GET(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  const quota = await whatsappQuotaFor(session.vetId);
  if (!quota) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  if (!quota.enabled) {
    return NextResponse.json({
      configured: whatsappConfigured(),
      ...quota,
      threads: [],
      messages: [],
    });
  }

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId") || "";

  const threads = await prisma.whatsAppThread.findMany({
    where: { veterinarianId: session.vetId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      breeder: {
        select: { firstName: true, lastName: true, farmName: true },
      },
    },
  });

  let messages: Array<{
    id: string;
    direction: string;
    body: string;
    createdAt: string;
  }> = [];

  if (threadId) {
    const thread = threads.find((row) => row.id === threadId);
    if (thread) {
      if (thread.unreadCount > 0) {
        await prisma.whatsAppThread.update({
          where: { id: thread.id },
          data: { unreadCount: 0 },
        });
        thread.unreadCount = 0;
      }
      const rows = await prisma.whatsAppMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "asc" },
        take: 200,
      });
      messages = rows.map((row) => ({
        id: row.id,
        direction: row.direction,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      }));
    }
  }

  return NextResponse.json({
    configured: whatsappConfigured(),
    ...quota,
    threads: threads.map(serializeThread),
    messages,
  });
}

const postSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(4096),
});

export async function POST(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  if (!whatsappConfigured()) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const vet = await prisma.veterinarian.findUnique({
    where: { id: session.vetId },
    select: { whatsappEnabled: true },
  });
  if (!vet?.whatsappEnabled) {
    return NextResponse.json({ error: "DISABLED" }, { status: 403 });
  }

  const thread = await prisma.whatsAppThread.findFirst({
    where: { id: parsed.data.threadId, veterinarianId: session.vetId },
    include: {
      breeder: { select: { firstName: true, lastName: true } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!windowOpen(thread.lastInboundAt)) {
    return NextResponse.json({ error: "WINDOW_CLOSED" }, { status: 409 });
  }

  const quota = await whatsappQuotaFor(session.vetId);
  if (!quota?.enabled) {
    return NextResponse.json({ error: "DISABLED" }, { status: 403 });
  }
  if (quota.used >= quota.limit) {
    return NextResponse.json({ error: "QUOTA" }, { status: 429 });
  }

  const sent = await sendWhatsAppText({
    to: thread.phone,
    body: parsed.data.body,
  });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 502 });
  }

  await recordSuccessfulWhatsAppSend(session.vetId);
  const contactName = thread.breeder
    ? `${thread.breeder.firstName} ${thread.breeder.lastName}`.trim()
    : thread.contactName;
  await recordThreadMessage({
    veterinarianId: session.vetId,
    breederId: thread.breederId,
    phone: thread.phone,
    contactName,
    direction: "OUT",
    body: parsed.data.body.trim(),
    metaId: sent.id || null,
  });

  return NextResponse.json({ ok: true });
}
