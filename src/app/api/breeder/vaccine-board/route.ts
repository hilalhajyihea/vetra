import { NextResponse } from "next/server";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import {
  animalRecordForType,
  serializeVaccineDate,
  summarizeBoardStatuses,
  vaccinationBoardStatus,
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
      group.animals.map((animal) => {
        const approved = animalRecordForType(
          animal.vaccinations.filter(
            (item) => !item.status || item.status === "APPROVED",
          ),
          type,
        );
        const latest = animalRecordForType(animal.vaccinations, type);
        const latestStatus = vaccinationBoardStatus(latest);
        const approvedStatus = vaccinationBoardStatus(approved);
        return {
          id: animal.id,
          number: animal.number,
          groupId: group.id,
          groupName: group.name,
          givenAt: latest?.givenAt ? serializeVaccineDate(latest.givenAt) : null,
          validUntil: latest ? serializeVaccineDate(latest.validUntil) : null,
          boosterDueAt: latest?.boosterDueAt
            ? serializeVaccineDate(latest.boosterDueAt)
            : null,
          courseStage: latest?.courseStage || null,
          valid: latestStatus.status === "valid",
          needsBooster: latestStatus.needsBooster,
          boardStatus: latestStatus.status,
          pending: latest?.status === "PENDING",
          approvedUntil: approved
            ? serializeVaccineDate(approved.validUntil)
            : null,
          approvedStatus: approvedStatus.status,
          approvedDate: approvedStatus.date,
        };
      }),
    );

    const groupRows = groups
      .map((group) => {
        const inGroup = animals.filter((animal) => animal.groupId === group.id);
        if (!inGroup.length) return null;
        const summary = summarizeBoardStatuses(
          inGroup.map((row) => ({
            status: row.approvedStatus,
            date: row.approvedDate,
          })),
        );
        return {
          id: group.id,
          name: group.name,
          status: summary.status,
          date: summary.date,
          count: inGroup.length,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const overall = summarizeBoardStatuses(
      animals.map((row) => ({
        status: row.approvedStatus,
        date: row.approvedDate,
      })),
    );

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
