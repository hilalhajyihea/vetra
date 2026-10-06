import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { GENE_TYPES, animalNumbersMatch, jerusalemTodayKey, toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  groupId: z.string().min(1),
  number: z.string().min(1).max(40),
  sex: z.enum(["MALE", "FEMALE"]),
  geneType: z.union([z.enum(GENE_TYPES), z.literal("")]).optional(),
  birthDate: z.string().min(8),
  pregnant: z.boolean().optional(),
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

  const group = await prisma.animalGroup.findFirst({
    where: { id: parsed.data.groupId, breederId: auth.breeder.id },
  });
  if (!group) {
    return NextResponse.json({ error: "קבוצה לא נמצאה" }, { status: 404 });
  }

  const birthKey = toDateKey(parsed.data.birthDate);
  if (birthKey > jerusalemTodayKey()) {
    return NextResponse.json({ error: "BIRTH_FUTURE" }, { status: 400 });
  }

  const number = parsed.data.number.trim();
  const existing = await prisma.animal.findUnique({
    where: {
      breederId_number: {
        breederId: auth.breeder.id,
        number,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "NUMBER_TAKEN" }, { status: 409 });
  }

  const animal = await prisma.animal.create({
    data: {
      breederId: auth.breeder.id,
      groupId: group.id,
      number,
      sex: parsed.data.sex,
      geneType: parsed.data.geneType || "",
      birthDate: new Date(`${birthKey}T00:00:00.000Z`),
      pregnant: parsed.data.sex === "FEMALE" ? Boolean(parsed.data.pregnant) : false,
    },
  });

  return NextResponse.json({ animal });
}

const patchSchema = z
  .object({
    id: z.string().min(1).optional(),
    numbers: z.array(z.string().min(1).max(40)).max(300).optional(),
    groupId: z.string().min(1).optional(),
    pregnant: z.boolean().optional(),
    geneType: z.union([z.enum(GENE_TYPES), z.literal("")]).optional(),
  })
  .refine(
    (data) => Boolean(data.id) || (data.numbers && data.numbers.length > 0),
  );

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

  let nextGroupId: string | undefined;
  if (parsed.data.groupId) {
    const group = await prisma.animalGroup.findFirst({
      where: { id: parsed.data.groupId, breederId: auth.breeder.id },
    });
    if (!group) {
      return NextResponse.json({ error: "קבוצה לא נמצאה" }, { status: 404 });
    }
    nextGroupId = group.id;
  }

  if (parsed.data.numbers?.length) {
    if (!nextGroupId) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const wanted = [
      ...new Set(
        parsed.data.numbers.map((value) => value.trim()).filter(Boolean),
      ),
    ];
    const animals = await prisma.animal.findMany({
      where: { breederId: auth.breeder.id },
      select: { id: true, number: true, groupId: true },
    });
    const missing: string[] = [];
    const matchedIds: string[] = [];
    for (const number of wanted) {
      const animal = animals.find((item) =>
        animalNumbersMatch(item.number, number),
      );
      if (!animal) {
        missing.push(number);
        continue;
      }
      if (!matchedIds.includes(animal.id)) matchedIds.push(animal.id);
    }
    if (matchedIds.length) {
      await prisma.animal.updateMany({
        where: { id: { in: matchedIds }, breederId: auth.breeder.id },
        data: { groupId: nextGroupId },
      });
    }
    return NextResponse.json({
      moved: matchedIds.length,
      missing,
    });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const animal = await prisma.animal.findFirst({
    where: { id: parsed.data.id, breederId: auth.breeder.id },
  });
  if (!animal) {
    return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
  }
  if (animal.sex !== "FEMALE" && parsed.data.pregnant) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const updated = await prisma.animal.update({
    where: { id: animal.id },
    data: {
      ...(parsed.data.pregnant !== undefined
        ? {
            pregnant:
              animal.sex === "FEMALE" ? Boolean(parsed.data.pregnant) : false,
          }
        : {}),
      ...(parsed.data.geneType !== undefined
        ? { geneType: parsed.data.geneType }
        : {}),
      ...(nextGroupId ? { groupId: nextGroupId } : {}),
    },
  });

  return NextResponse.json({ animal: updated });
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

  const animal = await prisma.animal.findFirst({
    where: { id, breederId: auth.breeder.id },
  });
  if (!animal) {
    return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
  }

  await prisma.animal.delete({ where: { id: animal.id } });
  return NextResponse.json({ ok: true });
}
