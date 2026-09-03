import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function namesMatch(typed: string, expected: string) {
  return typed.replace(/\s+/g, " ").trim() === expected.replace(/\s+/g, " ").trim();
}

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

const deleteSchema = z.object({
  id: z.string().min(1),
  confirmName: z.string().min(1).max(200),
});

export async function DELETE(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const existing = await prisma.breeder.findFirst({
    where: { id: parsed.data.id, veterinarianId: session.vetId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "מגדל לא נמצא" }, { status: 404 });
  }

  const expected = `${existing.firstName} ${existing.lastName}`.trim();
  if (!namesMatch(parsed.data.confirmName, expected)) {
    return NextResponse.json({ error: "NAME_MISMATCH" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.animal.deleteMany({ where: { breederId: existing.id } });
    await tx.animalGroup.deleteMany({ where: { breederId: existing.id } });
    await tx.appointment.deleteMany({ where: { breederId: existing.id } });
    await tx.breeder.delete({ where: { id: existing.id } });
  });

  return NextResponse.json({ ok: true });
}
