import { NextResponse } from "next/server";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import {
  animalRecordForType,
  boardStatusForDates,
  serializeVaccineDate,
} from "@/lib/vaccineBoard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const [types, groups] = await Promise.all([
    prisma.vaccineType.findMany({
      where: { veterinarianId: auth.breeder.veterinarianId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.animalGroup.findMany({
      where: { breederId: auth.breeder.id },
      orderBy: { createdAt: "asc" },
      include: {
        animals: {
          orderBy: { number: "asc" },
          include: {
            vaccinations: true,
          },
        },
      },
    }),
  ]);

  const vaccines = types.map((type) => {
    const animals = groups.flatMap((group) =>
      group.animals
        .map((animal) => {
          const record = animalRecordForType(animal.vaccinations, type);
          if (!record) return null;
          return {
            id: animal.id,
            number: animal.number,
            groupId: group.id,
            groupName: group.name,
            validUntil: serializeVaccineDate(record.validUntil),
            valid: boardStatusForDates([record.validUntil]).status === "valid",
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    );

    const groupRows = groups
      .map((group) => {
        const inGroup = animals.filter((animal) => animal.groupId === group.id);
        if (!inGroup.length) return null;
        const summary = boardStatusForDates(inGroup.map((row) => row.validUntil));
        return {
          id: group.id,
          name: group.name,
          status: summary.status,
          date: summary.date,
          count: inGroup.length,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const overall = boardStatusForDates(animals.map((row) => row.validUntil));

    return {
      id: type.id,
      name: type.name,
      description: type.description,
      status: overall.status,
      date: overall.date,
      groups: groupRows,
      animals,
    };
  });

  return NextResponse.json({ vaccines });
}
