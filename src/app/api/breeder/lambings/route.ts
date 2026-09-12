import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { serializeLambing } from "@/lib/lambing";
import { syncLatestLambingDate, upsertAnimalLambing } from "@/lib/lambingStore";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  animalId: z.string().min(1),
  lambedAt: z.string().min(8),
  bornCount: z.coerce.number().int(),
  aliveCount: z.coerce.number().int().optional(),
  note: z.string().max(120).optional(),
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
    where: {
      id: parsed.data.animalId,
      breederId: auth.breeder.id,
      sex: "FEMALE",
    },
  });
  if (!animal) {
    return NextResponse.json({ error: "חיה לא נמצאה" }, { status: 404 });
  }

  const result = await upsertAnimalLambing({
    animalId: animal.id,
    lambedAt: parsed.data.lambedAt,
    bornCount: parsed.data.bornCount,
    aliveCount: parsed.data.aliveCount,
    note: parsed.data.note,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ lambing: serializeLambing(result.lambing) });
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

  const lambing = await prisma.animalLambing.findFirst({
    where: { id, animal: { breederId: auth.breeder.id } },
  });
  if (!lambing) {
    return NextResponse.json({ error: "המלטה לא נמצאה" }, { status: 404 });
  }

  await prisma.animalLambing.delete({ where: { id: lambing.id } });
  await syncLatestLambingDate(lambing.animalId);
  return NextResponse.json({ ok: true });
}
