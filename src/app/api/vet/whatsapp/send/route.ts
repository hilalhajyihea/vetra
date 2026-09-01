import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { dualhookConfigured, sendDualhookTemplate } from "@/lib/dualhook";
import { fillWhatsAppTemplate } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  return NextResponse.json({ configured: dualhookConfigured() });
}

const postSchema = z.object({
  text: z.string().min(1).max(1024),
  breederIds: z.array(z.string().min(1)).max(50).optional(),
  testSelf: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  if (!dualhookConfigured()) {
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
      phone: true,
      clinicName: true,
      displayName: true,
    },
  });
  if (!vet) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const clinic = vet.clinicName || vet.displayName;
  const results: Array<{
    id: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];

  async function sendOne(
    id: string,
    label: string,
    phone: string,
    name: string,
    farm: string,
  ) {
    const body = fillWhatsAppTemplate(payload.text, {
      name,
      farm,
      clinic,
    });
    const sent = await sendDualhookTemplate({
      to: phone,
      name,
      body,
    });
    results.push({
      id,
      name: label,
      ok: sent.ok,
      error: sent.ok ? undefined : sent.error,
    });
  }

  if (payload.testSelf) {
    if (!vet.phone) {
      return NextResponse.json({ error: "PHONE_MISSING" }, { status: 400 });
    }
    await sendOne(
      "self",
      vet.displayName,
      vet.phone,
      vet.displayName,
      clinic,
    );
    return NextResponse.json({ results });
  }

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
    await sendOne(
      breeder.id,
      `${breeder.firstName} ${breeder.lastName}`.trim(),
      breeder.phone,
      breeder.firstName,
      breeder.farmName,
    );
  }

  return NextResponse.json({ results });
}
