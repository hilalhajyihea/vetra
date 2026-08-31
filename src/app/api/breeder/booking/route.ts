import { NextResponse } from "next/server";
import { z } from "zod";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import {
  israelNowMinutes,
  rollingMonths,
  slotsFromWindow,
} from "@/lib/booking";
import { jerusalemTodayKey, parseOptionalDate, toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

function monthRange() {
  const months = rollingMonths(3);
  const first = months[0];
  const last = months[months.length - 1];
  const start = new Date(Date.UTC(first.year, first.month, 1));
  const end = new Date(Date.UTC(last.year, last.month + 1, 1));
  return { months, start, end };
}

export async function GET(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { months, start, end } = monthRange();
  const vetId = auth.breeder.veterinarianId;
  const today = jerusalemTodayKey();
  const nowMin = israelNowMinutes();

  const [windows, appointments, mine] = await Promise.all([
    prisma.bookingWindow.findMany({
      where: {
        veterinarianId: vetId,
        date: { gte: start, lt: end },
      },
    }),
    prisma.appointment.findMany({
      where: {
        veterinarianId: vetId,
        date: { gte: start, lt: end },
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { date: true, startMin: true },
    }),
    prisma.appointment.findMany({
      where: {
        veterinarianId: vetId,
        breederId: auth.breeder.id,
        date: { gte: start, lt: end },
      },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
    }),
  ]);

  const taken = new Set(
    appointments.map((item) => `${toDateKey(item.date)}:${item.startMin}`),
  );

  const days: Record<string, { slots: number[] }> = {};
  for (const window of windows) {
    const date = toDateKey(window.date);
    const slots = slotsFromWindow(window.startMin, window.endMin).filter(
      (startMin) => {
        if (taken.has(`${date}:${startMin}`)) return false;
        if (date < today) return false;
        if (date === today && startMin <= nowMin) return false;
        return true;
      },
    );
    if (!slots.length) continue;
    const current = new Set(days[date]?.slots || []);
    for (const slot of slots) current.add(slot);
    days[date] = { slots: [...current].sort((a, b) => a - b) };
  }

  return NextResponse.json({
    months,
    days,
    mine: mine.map((item) => ({
      id: item.id,
      date: toDateKey(item.date),
      startMin: item.startMin,
      reason: item.reason,
      status: item.status,
    })),
  });
}

const createSchema = z.object({
  date: z.string().min(8),
  startMin: z.number().int().min(0),
  reason: z.string().min(1).max(300),
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

  const dateKey = parsed.data.date.slice(0, 10);
  const today = jerusalemTodayKey();
  if (dateKey < today) {
    return NextResponse.json({ error: "PAST_SLOT" }, { status: 400 });
  }
  if (dateKey === today && parsed.data.startMin <= israelNowMinutes()) {
    return NextResponse.json({ error: "PAST_SLOT" }, { status: 400 });
  }

  const date = parseOptionalDate(dateKey);
  if (!date) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const windows = await prisma.bookingWindow.findMany({
    where: {
      veterinarianId: auth.breeder.veterinarianId,
      date,
    },
  });
  const allowed = windows.some((window) =>
    slotsFromWindow(window.startMin, window.endMin).includes(parsed.data.startMin),
  );
  if (!allowed) {
    return NextResponse.json({ error: "SLOT_CLOSED" }, { status: 400 });
  }

  const clash = await prisma.appointment.findFirst({
    where: {
      veterinarianId: auth.breeder.veterinarianId,
      date,
      startMin: parsed.data.startMin,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (clash) {
    return NextResponse.json({ error: "TAKEN" }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      veterinarianId: auth.breeder.veterinarianId,
      breederId: auth.breeder.id,
      date,
      startMin: parsed.data.startMin,
      reason: parsed.data.reason.trim(),
      status: "PENDING",
    },
  });
  return NextResponse.json({ appointment });
}
