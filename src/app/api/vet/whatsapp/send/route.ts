import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { sendWhatsAppTemplate, whatsappConfigured } from "@/lib/whatsappCloud";
import { recordThreadMessage } from "@/lib/whatsappInbox";
import {
  recordSuccessfulWhatsAppSend,
  whatsappQuotaFor,
} from "@/lib/whatsappQuota";
import { fillWhatsAppTemplate } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  const quota = await whatsappQuotaFor(session.vetId);
  if (!quota) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  return NextResponse.json({
    configured: whatsappConfigured(),
    ...quota,
  });
}

const postSchema = z.object({
  text: z.string().min(1).max(1024),
  breederIds: z.array(z.string().min(1)).max(50).optional(),
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
  const payload = parsed.data;

  const vet = await prisma.veterinarian.findUnique({
    where: { id: session.vetId },
    select: {
      clinicName: true,
      displayName: true,
      whatsappEnabled: true,
    },
  });
  if (!vet) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  if (!vet.whatsappEnabled) {
    return NextResponse.json({ error: "DISABLED" }, { status: 403 });
  }

  const clinic = vet.clinicName || vet.displayName;
  const results: Array<{
    id: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];

  const ids = payload.breederIds || [];
  if (!ids.length) {
    return NextResponse.json({ error: "EMPTY" }, { status: 400 });
  }

  const breeders = await prisma.breeder.findMany({
    where: {
      id: { in: ids },
      veterinarianId: session.vetId,
      status: "APPROVED",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      farmName: true,
      phone: true,
    },
  });

  for (const breeder of breeders) {
    const label = `${breeder.firstName} ${breeder.lastName}`.trim();
    const quota = await whatsappQuotaFor(session.vetId);
    if (!quota?.enabled) {
      results.push({ id: breeder.id, name: label, ok: false, error: "DISABLED" });
      continue;
    }
    if (quota.used >= quota.limit) {
      results.push({ id: breeder.id, name: label, ok: false, error: "QUOTA" });
      continue;
    }

    const body = fillWhatsAppTemplate(payload.text, {
      name: breeder.firstName,
      farm: breeder.farmName,
      clinic,
    });
    const sent = await sendWhatsAppTemplate({
      to: breeder.phone,
      name: breeder.firstName,
      body,
    });
    if (sent.ok) {
      await recordSuccessfulWhatsAppSend(session.vetId);
      await recordThreadMessage({
        veterinarianId: session.vetId,
        breederId: breeder.id,
        phone: breeder.phone,
        contactName: label,
        direction: "OUT",
        body,
        metaId: sent.id || null,
      });
    }
    results.push({
      id: breeder.id,
      name: label,
      ok: sent.ok,
      error: sent.ok ? undefined : sent.error,
    });
  }

  return NextResponse.json({ results });
}
