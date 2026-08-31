import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { parseOptionalDate } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const windows = await prisma.bookingWindow.findMany({
    where: { veterinarianId: session.vetId },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  return NextResponse.json({ windows });
}

const createSchema = z.object({
  date: z.string().min(8),
  startMin: z.number().int().min(0).max(24 * 60 - 30),
  endMin: z.number().int().min(30).max(24 * 60),
});

export async function POST(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.endMin - parsed.data.startMin < 30) {
    return NextResponse.json({ error: "WINDOW_INVALID" }, { status: 400 });
  }

  const date = parseOptionalDate(parsed.data.date);
  if (!date) {
    return NextResponse.json({ error: "WINDOW_INVALID" }, { status: 400 });
  }

  const window = await prisma.bookingWindow.create({
    data: {
      veterinarianId: session.vetId,
      date,
      startMin: parsed.data.startMin,
      endMin: parsed.data.endMin,
    },
  });

  return NextResponse.json({ window });
}

export async function DELETE(request: Request) {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const existing = await prisma.bookingWindow.findFirst({
    where: { id, veterinarianId: session.vetId },
  });
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  await prisma.bookingWindow.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
