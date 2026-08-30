import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { dateInputValue, parseOptionalDate } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

function serializeFemale(animal: {
  id: string;
  number: string;
  pregnant: boolean;
  matingDate: Date | null;
  lambingDate: Date | null;
  checkup1Date: Date | null;
  checkup2Date: Date | null;
  breedingMethod: string | null;
}) {
  return {
    id: animal.id,
    number: animal.number,
    pregnant: animal.pregnant,
    matingDate: dateInputValue(animal.matingDate),
    lambingDate: dateInputValue(animal.lambingDate),
    checkup1Date: dateInputValue(animal.checkup1Date),
    checkup2Date: dateInputValue(animal.checkup2Date),
    breedingMethod:
      animal.breedingMethod === "NATURAL" ||
      animal.breedingMethod === "SPONGE" ||
      animal.breedingMethod === "AI"
        ? animal.breedingMethod
        : "",
  };
}

function sharedValue(values: string[]) {
  if (!values.length) return "";
  return values.every((value) => value === values[0]) ? values[0] : "";
}

export async function GET(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const groups = await prisma.animalGroup.findMany({
    where: { breederId: auth.breeder.id },
    orderBy: { createdAt: "asc" },
    include: {
      animals: {
        where: { sex: "FEMALE" },
        orderBy: { number: "asc" },
      },
    },
  });

  return NextResponse.json({
    groups: groups.map((group) => {
      const females = group.animals.map(serializeFemale);
      return {
        id: group.id,
        name: group.name,
        pregnant: females.some((animal) => animal.pregnant),
        matingDate: sharedValue(females.map((animal) => animal.matingDate)),
        lambingDate: sharedValue(females.map((animal) => animal.lambingDate)),
        checkup1Date: sharedValue(females.map((animal) => animal.checkup1Date)),
        checkup2Date: sharedValue(females.map((animal) => animal.checkup2Date)),
        females,
      };
    }),
  });
}

const patchSchema = z.object({
  target: z.enum(["group", "animal"]),
  id: z.string().min(1),
  pregnant: z.boolean(),
  matingDate: z.string().optional(),
  lambingDate: z.string().optional(),
  checkup1Date: z.string().optional(),
  checkup2Date: z.string().optional(),
  breedingMethod: z.enum(["NATURAL", "SPONGE", "AI", ""]).optional(),
});

function pregnancyData(input: z.infer<typeof patchSchema>, includeMethod: boolean) {
  return {
    pregnant: input.pregnant,
    matingDate: parseOptionalDate(input.matingDate),
    lambingDate: parseOptionalDate(input.lambingDate),
    checkup1Date: parseOptionalDate(input.checkup1Date),
    checkup2Date: parseOptionalDate(input.checkup2Date),
    ...(includeMethod
      ? { breedingMethod: input.breedingMethod || null }
      : {}),
  };
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const auth = await requireFarmAccess(farmIdFromRequest(request, body));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  if (parsed.data.target === "group") {
    const group = await prisma.animalGroup.findFirst({
      where: { id: parsed.data.id, breederId: auth.breeder.id },
    });
    if (!group) {
      return NextResponse.json({ error: "קבוצה לא נמצאה" }, { status: 404 });
    }

    await prisma.animal.updateMany({
      where: { groupId: group.id, breederId: auth.breeder.id, sex: "FEMALE" },
      data: pregnancyData(parsed.data, false),
    });
    return NextResponse.json({ ok: true });
  }

  const animal = await prisma.animal.findFirst({
    where: { id: parsed.data.id, breederId: auth.breeder.id, sex: "FEMALE" },
  });
  if (!animal) {
    return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
  }

  const updated = await prisma.animal.update({
    where: { id: animal.id },
    data: pregnancyData(parsed.data, true),
  });

  return NextResponse.json({ animal: serializeFemale(updated) });
}
