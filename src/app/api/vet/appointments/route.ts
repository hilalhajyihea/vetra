import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVetSession } from "@/lib/auth";
import { jerusalemTodayKey, toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireVetSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const today = jerusalemTodayKey();
  const appointments = await prisma.appointment.findMany({
    where: {
      veterinarianId: session.vetId,
      date: { gte: new Date(`${today}T00:00:00.000Z`) },
      status: { in: ["PENDING", "APPROVED"] },
    },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
    include: {
      breeder: {
        select: {
          firstName: true,
          lastName: true,
          farmName: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json({
    appointments: appointments.map((item) => ({
      id: item.id,
      date: toDateKey(item.date),
      startMin: item.startMin,
      reason: item.reason,
      status: item.status,
      breeder: item.breeder,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "CANCELLED"]),
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

  const existing = await prisma.appointment.findFirst({
    where: {
      id: parsed.data.id,
      veterinarianId: session.vetId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "תור לא נמצא" }, { status: 404 });
  }

  const appointment = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      status: appointment.status,
    },
  });
}
