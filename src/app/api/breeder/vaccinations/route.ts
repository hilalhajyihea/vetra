import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { animalNumbersMatch, toDateKey, validUntilFromGiven } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    animalId: z.string().min(1).optional(),
    numbers: z.array(z.string().min(1).max(40)).max(300).optional(),
    vaccineTypeId: z.string().min(1).optional(),
    name: z.string().min(1).max(80).optional(),
    givenAt: z.string().min(8),
  })
  .refine(
    (data) => Boolean(data.animalId) || (data.numbers && data.numbers.length > 0),
  );

type FarmAuth = NonNullable<Awaited<ReturnType<typeof requireFarmAccess>>>;

async function findVaccineType(
  auth: FarmAuth,
  vaccineTypeId?: string,
  name?: string,
) {
  if (vaccineTypeId) {
    return prisma.vaccineType.findFirst({
      where: {
        id: vaccineTypeId,
        veterinarianId: auth.breeder.veterinarianId,
      },
    });
  }
  if (name) {
    return prisma.vaccineType.findFirst({
      where: {
        veterinarianId: auth.breeder.veterinarianId,
        name: name.trim(),
      },
    });
  }
  return null;
}

async function applyVaccination(
  auth: FarmAuth,
  animalId: string,
  type: { id: string; name: string; validMonths: number },
  givenKey: string,
) {
  const untilKey = validUntilFromGiven(givenKey, type.validMonths);
  const existing = await prisma.animalVaccination.findFirst({
    where: {
      animalId,
      OR: [{ vaccineTypeId: type.id }, { name: type.name }],
    },
    orderBy: { validUntil: "desc" },
  });

  const data = {
    vaccineTypeId: type.id,
    name: type.name,
    givenAt: new Date(`${givenKey}T00:00:00.000Z`),
    validUntil: new Date(`${untilKey}T00:00:00.000Z`),
    status: auth.actor === "vet" ? "APPROVED" : "PENDING",
  };

  return existing
    ? prisma.animalVaccination.update({
        where: { id: existing.id },
        data,
      })
    : prisma.animalVaccination.create({
        data: {
          animalId,
          ...data,
        },
      });
}

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

  const type = await findVaccineType(
    auth,
    parsed.data.vaccineTypeId,
    parsed.data.name,
  );
  if (!type) {
    return NextResponse.json({ error: "VACCINE_UNKNOWN" }, { status: 400 });
  }

  const givenKey = toDateKey(parsed.data.givenAt);

  if (parsed.data.animalId) {
    const animal = await prisma.animal.findFirst({
      where: { id: parsed.data.animalId, breederId: auth.breeder.id },
    });
    if (!animal) {
      return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
    }
    const vaccination = await applyVaccination(auth, animal.id, type, givenKey);
    return NextResponse.json({ vaccination });
  }

  const wanted = [
    ...new Set((parsed.data.numbers || []).map((value) => value.trim()).filter(Boolean)),
  ];
  const animals = await prisma.animal.findMany({
    where: { breederId: auth.breeder.id },
    select: { id: true, number: true },
  });

  const missing: string[] = [];
  const matchedIds: string[] = [];
  for (const number of wanted) {
    const animal = animals.find((item) => animalNumbersMatch(item.number, number));
    if (!animal) {
      missing.push(number);
      continue;
    }
    if (!matchedIds.includes(animal.id)) matchedIds.push(animal.id);
  }

  for (const animalId of matchedIds) {
    await applyVaccination(auth, animalId, type, givenKey);
  }

  return NextResponse.json({
    vaccinated: matchedIds.length,
    missing,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const vaccination = await prisma.animalVaccination.findFirst({
    where: { id, animal: { breederId: auth.breeder.id } },
  });
  if (!vaccination) {
    return NextResponse.json({ error: "חיסון לא נמצא" }, { status: 404 });
  }

  await prisma.animalVaccination.delete({ where: { id: vaccination.id } });
  return NextResponse.json({ ok: true });
}
