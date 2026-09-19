import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { isLifetimeVaccineMonths, rescheduleExistingVaccination } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const vaccines = await prisma.vaccineType.findMany({
    where: { veterinarianId: session.vetId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ vaccines });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(800).optional(),
  validMonths: z.number().int().min(0).max(60),
  boosterEnabled: z.boolean().optional(),
  boosterAfterDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const existing = await prisma.vaccineType.findUnique({
    where: {
      veterinarianId_name: {
        veterinarianId: session.vetId,
        name,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "NAME_TAKEN" }, { status: 409 });
  }

  const vaccine = await prisma.vaccineType.create({
    data: {
      veterinarianId: session.vetId,
      name,
      description: (parsed.data.description || "").trim(),
      validMonths: parsed.data.validMonths,
      boosterEnabled:
        !isLifetimeVaccineMonths(parsed.data.validMonths) &&
        Boolean(parsed.data.boosterEnabled),
      boosterAfterDays: parsed.data.boosterAfterDays || 7,
    },
  });

  return NextResponse.json({ vaccine });
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(800).optional(),
  validMonths: z.number().int().min(0).max(60).optional(),
  boosterEnabled: z.boolean().optional(),
  boosterAfterDays: z.number().int().min(1).max(365).optional(),
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

  const existing = await prisma.vaccineType.findFirst({
    where: { id: parsed.data.id, veterinarianId: session.vetId },
  });
  if (!existing) {
    return NextResponse.json({ error: "חיסון לא נמצא" }, { status: 404 });
  }

  const name = parsed.data.name?.trim();
  if (name && name !== existing.name) {
    const clash = await prisma.vaccineType.findFirst({
      where: {
        veterinarianId: session.vetId,
        name,
        NOT: { id: existing.id },
      },
    });
    if (clash) {
      return NextResponse.json({ error: "NAME_TAKEN" }, { status: 409 });
    }
  }

  const nextMonths = parsed.data.validMonths ?? existing.validMonths;
  const nextBoosterEnabled =
    parsed.data.boosterEnabled !== undefined
      ? parsed.data.boosterEnabled
      : existing.boosterEnabled;
  const nextDays = parsed.data.boosterAfterDays ?? existing.boosterAfterDays;
  const scheduleChanged =
    parsed.data.validMonths !== undefined ||
    parsed.data.boosterEnabled !== undefined ||
    parsed.data.boosterAfterDays !== undefined;

  const vaccine = await prisma.vaccineType.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description.trim() }
        : {}),
      ...(parsed.data.validMonths !== undefined
        ? { validMonths: parsed.data.validMonths }
        : {}),
      ...(parsed.data.boosterEnabled !== undefined ||
      parsed.data.validMonths !== undefined
        ? {
            boosterEnabled:
              !isLifetimeVaccineMonths(nextMonths) && nextBoosterEnabled,
          }
        : {}),
      ...(parsed.data.boosterAfterDays !== undefined
        ? { boosterAfterDays: parsed.data.boosterAfterDays }
        : {}),
    },
  });

  if (scheduleChanged) {
    const records = await prisma.animalVaccination.findMany({
      where: { vaccineTypeId: vaccine.id },
    });
    const plan = {
      validMonths: vaccine.validMonths,
      boosterEnabled: vaccine.boosterEnabled,
      boosterAfterDays: nextDays,
    };
    for (const record of records) {
      const next = rescheduleExistingVaccination(plan, record);
      if (!next) continue;
      await prisma.animalVaccination.update({
        where: { id: record.id },
        data: next,
      });
    }
  }

  return NextResponse.json({ vaccine });
}

export async function DELETE(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const existing = await prisma.vaccineType.findFirst({
    where: { id, veterinarianId: session.vetId },
  });
  if (!existing) {
    return NextResponse.json({ error: "חיסון לא נמצא" }, { status: 404 });
  }

  await prisma.vaccineType.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
