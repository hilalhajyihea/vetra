import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  animalId: z.string().min(1),
  vaccineTypeId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).optional(),
  validUntil: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const auth = await requireFarmAccess(farmIdFromRequest(request, body));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const animal = await prisma.animal.findFirst({
    where: { id: parsed.data.animalId, breederId: auth.breeder.id },
  });
  if (!animal) {
    return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
  }

  const type = parsed.data.vaccineTypeId
    ? await prisma.vaccineType.findFirst({
        where: {
          id: parsed.data.vaccineTypeId,
          veterinarianId: auth.breeder.veterinarianId,
        },
      })
    : parsed.data.name
      ? await prisma.vaccineType.findFirst({
          where: {
            veterinarianId: auth.breeder.veterinarianId,
            name: parsed.data.name.trim(),
          },
        })
      : null;
  if (!type) {
    return NextResponse.json({ error: "VACCINE_UNKNOWN" }, { status: 400 });
  }

  const validUntil = toDateKey(parsed.data.validUntil);
  const existing = await prisma.animalVaccination.findFirst({
    where: {
      animalId: animal.id,
      OR: [{ vaccineTypeId: type.id }, { name: type.name }],
    },
    orderBy: { validUntil: "desc" },
  });

  const data = {
    vaccineTypeId: type.id,
    name: type.name,
    validUntil: new Date(`${validUntil}T00:00:00.000Z`),
  };

  const vaccination = existing
    ? await prisma.animalVaccination.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.animalVaccination.create({
        data: {
          animalId: animal.id,
          ...data,
        },
      });

  return NextResponse.json({ vaccination });
}
