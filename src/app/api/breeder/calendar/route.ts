import { NextResponse } from "next/server";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

type EventKind =
  | "vaccine"
  | "vaccineGiven"
  | "mating"
  | "lambing"
  | "checkup1"
  | "checkup2"
  | "appointment";

function pushEvent(
  events: Array<{
    date: string;
    kind: EventKind;
    name?: string;
    animalNumber?: string;
    groupName?: string;
    startMin?: number;
    status?: string;
  }>,
  date: Date | null | undefined,
  kind: EventKind,
  extra?: {
    animalNumber?: string;
    groupName?: string;
    name?: string;
    startMin?: number;
    status?: string;
  },
) {
  if (!date) return;
  events.push({
    date: toDateKey(date),
    kind,
    ...extra,
  });
}

export async function GET(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const animals = await prisma.animal.findMany({
    where: { breederId: auth.breeder.id },
    orderBy: { number: "asc" },
    include: {
      group: { select: { name: true } },
      vaccinations: { orderBy: { validUntil: "asc" } },
    },
  });

  const events: Array<{
    date: string;
    kind: EventKind;
    name?: string;
    animalNumber?: string;
    groupName?: string;
    startMin?: number;
    status?: string;
  }> = [];

  for (const animal of animals) {
    const groupName = animal.group.name;
    for (const vaccine of animal.vaccinations) {
      pushEvent(events, vaccine.givenAt, "vaccineGiven", {
        animalNumber: animal.number,
        groupName,
        name: vaccine.name,
      });
      pushEvent(events, vaccine.validUntil, "vaccine", {
        animalNumber: animal.number,
        groupName,
        name: vaccine.name,
      });
    }
    pushEvent(events, animal.matingDate, "mating", {
      animalNumber: animal.number,
      groupName,
    });
    pushEvent(events, animal.lambingDate, "lambing", {
      animalNumber: animal.number,
      groupName,
    });
    pushEvent(events, animal.checkup1Date, "checkup1", {
      animalNumber: animal.number,
      groupName,
    });
    pushEvent(events, animal.checkup2Date, "checkup2", {
      animalNumber: animal.number,
      groupName,
    });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      breederId: auth.breeder.id,
      status: { in: ["PENDING", "APPROVED"] },
    },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  for (const item of appointments) {
    pushEvent(events, item.date, "appointment", {
      name: item.reason,
      startMin: item.startMin,
      status: item.status,
    });
  }

  return NextResponse.json({ events });
}
