import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { isValidMobile, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

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

  return NextResponse.json({
    phone: vet.phone || "",
    clinicName: vet.clinicName,
    displayName: vet.displayName,
  });
}

const patchSchema = z.object({
  phone: z.string().max(30),
});

export async function PATCH(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const raw = parsed.data.phone.trim();
  let phone: string | null = null;
  if (raw) {
    phone = normalizePhone(raw);
    if (!isValidMobile(phone)) {
      return NextResponse.json({ error: "PHONE_INVALID" }, { status: 400 });
    }
  }

  const vet = await prisma.veterinarian.update({
    where: { id: session.vetId },
    data: { phone },
    select: { phone: true },
  });

  return NextResponse.json({ phone: vet.phone || "" });
}
