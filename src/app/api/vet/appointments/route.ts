import { NextResponse } from "next/server";
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
      breeder: item.breeder,
    })),
  });
}
