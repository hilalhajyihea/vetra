import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const breeders = await prisma.breeder.findMany({
    where: { veterinarianId: session.vetId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      farmName: true,
      phone: true,
      email: true,
      status: true,
      createdAt: true,
      approvedAt: true,
    },
  });

  return NextResponse.json({ breeders });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const existing = await prisma.breeder.findFirst({
    where: { id: parsed.data.id, veterinarianId: session.vetId },
  });
  if (!existing) {
    return NextResponse.json({ error: "מגדל לא נמצא" }, { status: 404 });
  }

  const breeder = await prisma.breeder.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      approvedAt: parsed.data.status === "APPROVED" ? new Date() : null,
    },
  });

  return NextResponse.json({
    breeder: {
      id: breeder.id,
      status: breeder.status,
    },
  });
}
