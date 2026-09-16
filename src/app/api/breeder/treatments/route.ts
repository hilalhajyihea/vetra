import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { prisma } from "@/lib/prisma";

function serializeNote(note: {
  id: string;
  body: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: note.id,
    body: note.body,
    author: note.author === "vet" ? "vet" : "breeder",
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
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
        orderBy: { number: "asc" },
        include: {
          healthNotes: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  return NextResponse.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      count: group.animals.length,
      animals: group.animals.map((animal) => ({
        id: animal.id,
        number: animal.number,
        sex: animal.sex,
        groupId: group.id,
        groupName: group.name,
        notes: animal.healthNotes.map(serializeNote),
      })),
    })),
  });
}

const createSchema = z.object({
  animalId: z.string().min(1),
  body: z.string().min(1).max(2000),
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

  const note = await prisma.animalHealthNote.create({
    data: {
      animalId: animal.id,
      body: parsed.data.body.trim(),
      author: auth.actor,
    },
  });

  return NextResponse.json({ note: serializeNote(note) });
}

const patchSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(2000),
});

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

  const note = await prisma.animalHealthNote.findFirst({
    where: { id: parsed.data.id, animal: { breederId: auth.breeder.id } },
  });
  if (!note) {
    return NextResponse.json({ error: "תיעוד לא נמצא" }, { status: 404 });
  }

  const updated = await prisma.animalHealthNote.update({
    where: { id: note.id },
    data: { body: parsed.data.body.trim() },
  });

  return NextResponse.json({ note: serializeNote(updated) });
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

  const note = await prisma.animalHealthNote.findFirst({
    where: { id, animal: { breederId: auth.breeder.id } },
  });
  if (!note) {
    return NextResponse.json({ error: "תיעוד לא נמצא" }, { status: 404 });
  }

  await prisma.animalHealthNote.delete({ where: { id: note.id } });
  return NextResponse.json({ ok: true });
}
