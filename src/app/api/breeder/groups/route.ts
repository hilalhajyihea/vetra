import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { prisma } from "@/lib/prisma";

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
        orderBy: { number: "asc" },
        include: {
          vaccinations: { orderBy: { validUntil: "asc" } },
        },
      },
    },
  });

  return NextResponse.json({ groups });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
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

  const group = await prisma.animalGroup.create({
    data: {
      breederId: auth.breeder.id,
      name: parsed.data.name.trim(),
    },
  });

  return NextResponse.json({ group });
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

  const group = await prisma.animalGroup.findFirst({
    where: { id, breederId: auth.breeder.id },
    include: { _count: { select: { animals: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "קבוצה לא נמצאה" }, { status: 404 });
  }
  if (group._count.animals > 0) {
    return NextResponse.json({ error: "GROUP_NOT_EMPTY" }, { status: 409 });
  }

  await prisma.animalGroup.delete({ where: { id: group.id } });
  return NextResponse.json({ ok: true });
}
