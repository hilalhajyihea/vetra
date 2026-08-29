import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApprovedBreeder } from "@/lib/breederSession";
import { toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  animalId: z.string().min(1),
  name: z.string().min(1).max(80),
  validUntil: z.string().min(8),
});

export async function POST(request: Request) {
  const auth = await requireApprovedBreeder();
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
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

  const validUntil = toDateKey(parsed.data.validUntil);
  const vaccination = await prisma.animalVaccination.create({
    data: {
      animalId: animal.id,
      name: parsed.data.name.trim(),
      validUntil: new Date(`${validUntil}T00:00:00.000Z`),
    },
  });

  return NextResponse.json({ vaccination });
}
