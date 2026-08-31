import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { dateInputValue } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const records = await prisma.animalVaccination.findMany({
    where: {
      status: "PENDING",
      animal: { breeder: { veterinarianId: session.vetId } },
    },
    orderBy: { createdAt: "asc" },
    include: {
      animal: {
        select: {
          id: true,
          number: true,
          group: { select: { name: true } },
          breeder: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              farmName: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    records: records.map((item) => ({
      id: item.id,
      name: item.name,
      givenAt: dateInputValue(item.givenAt),
      validUntil: dateInputValue(item.validUntil),
      animalId: item.animal.id,
      animalNumber: item.animal.number,
      groupName: item.animal.group.name,
      breederId: item.animal.breeder.id,
      breederName: `${item.animal.breeder.firstName} ${item.animal.breeder.lastName}`,
      farmName: item.animal.breeder.farmName,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  animalId: z.string().min(1).optional(),
  all: z.boolean().optional(),
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

  const owned = {
    status: "PENDING" as const,
    animal: { breeder: { veterinarianId: session.vetId } },
  };

  if (parsed.data.all) {
    const result = await prisma.animalVaccination.updateMany({
      where: owned,
      data: { status: "APPROVED" },
    });
    return NextResponse.json({ ok: true, count: result.count });
  }

  if (parsed.data.animalId) {
    const animal = await prisma.animal.findFirst({
      where: {
        id: parsed.data.animalId,
        breeder: { veterinarianId: session.vetId },
      },
    });
    if (!animal) {
      return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
    }
    const result = await prisma.animalVaccination.updateMany({
      where: { animalId: animal.id, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    return NextResponse.json({ ok: true, count: result.count });
  }

  if (parsed.data.id) {
    const existing = await prisma.animalVaccination.findFirst({
      where: { id: parsed.data.id, ...owned },
    });
    if (!existing) {
      return NextResponse.json({ error: "חיסון לא נמצא" }, { status: 404 });
    }
    await prisma.animalVaccination.update({
      where: { id: existing.id },
      data: { status: "APPROVED" },
    });
    return NextResponse.json({ ok: true, count: 1 });
  }

  return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
}
