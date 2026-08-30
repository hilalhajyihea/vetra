import { NextResponse } from "next/server";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { toDateKey } from "@/lib/herd";
import { prisma } from "@/lib/prisma";

type EventKind =
  | "vaccine"
  | "mating"
  | "lambing"
  | "checkup1"
  | "checkup2";

function pushEvent(
  events: Array<{
    date: string;
    kind: EventKind;
    name?: string;
    animalNumber: string;
    groupName: string;
  }>,
  date: Date | null | undefined,
  kind: EventKind,
  animalNumber: string,
  groupName: string,
  name?: string,
) {
  if (!date) return;
  events.push({
    date: toDateKey(date),
    kind,
    name,
    animalNumber,
    groupName,
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
    animalNumber: string;
    groupName: string;
  }> = [];

  for (const animal of animals) {
    const groupName = animal.group.name;
    for (const vaccine of animal.vaccinations) {
      pushEvent(
        events,
        vaccine.validUntil,
        "vaccine",
        animal.number,
        groupName,
        vaccine.name,
      );
    }
    pushEvent(events, animal.matingDate, "mating", animal.number, groupName);
    pushEvent(events, animal.lambingDate, "lambing", animal.number, groupName);
    pushEvent(events, animal.checkup1Date, "checkup1", animal.number, groupName);
    pushEvent(events, animal.checkup2Date, "checkup2", animal.number, groupName);
  }

  return NextResponse.json({ events });
}
