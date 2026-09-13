import {
  jerusalemTodayKey,
  parseOptionalDate,
  toDateKey,
} from "@/lib/herd";
import {
  lambingCountsAreValid,
  normalizeLambingCounts,
} from "@/lib/lambing";
import { prisma } from "@/lib/prisma";

export async function syncLatestLambingDate(animalId: string) {
  const [latest, animal] = await Promise.all([
    prisma.animalLambing.findFirst({
      where: { animalId },
      orderBy: { lambedAt: "desc" },
    }),
    prisma.animal.findUnique({ where: { id: animalId } }),
  ]);
  const latestKey = latest ? toDateKey(latest.lambedAt) : "";
  const matingKey = animal?.matingDate ? toDateKey(animal.matingDate) : "";
  const endsCurrentPregnancy = Boolean(
    latestKey && (!matingKey || latestKey >= matingKey),
  );
  await prisma.animal.update({
    where: { id: animalId },
    data: {
      lambingDate: latest?.lambedAt ?? null,
      ...(endsCurrentPregnancy ? { pregnant: false } : {}),
    },
  });
}

export async function upsertAnimalLambing(input: {
  animalId: string;
  lambedAt: string;
  bornCount: number;
  aliveCount?: number | null;
  note?: string;
  previousLambedAt?: string | null;
}) {
  const lambedKey = toDateKey(input.lambedAt);
  if (lambedKey > jerusalemTodayKey()) {
    return { error: "LAMBING_FUTURE" as const };
  }

  const { bornCount, aliveCount } = normalizeLambingCounts(
    input.bornCount,
    input.aliveCount,
  );
  if (!lambingCountsAreValid(bornCount, aliveCount)) {
    return { error: "LAMBING_COUNTS" as const };
  }

  const lambedAt = parseOptionalDate(lambedKey);
  if (!lambedAt) {
    return { error: "LAMBING_FUTURE" as const };
  }

  const data = {
    lambedAt,
    bornCount,
    aliveCount,
    note: (input.note || "").trim().slice(0, 120),
  };

  const sameDate = await prisma.animalLambing.findFirst({
    where: { animalId: input.animalId, lambedAt },
  });
  const previousKey = input.previousLambedAt
    ? toDateKey(input.previousLambedAt)
    : "";
  const previous =
    !sameDate && previousKey && previousKey !== lambedKey
      ? await prisma.animalLambing.findFirst({
          where: {
            animalId: input.animalId,
            lambedAt: parseOptionalDate(previousKey) || undefined,
          },
        })
      : null;

  const lambing = sameDate
    ? await prisma.animalLambing.update({
        where: { id: sameDate.id },
        data,
      })
    : previous
      ? await prisma.animalLambing.update({
          where: { id: previous.id },
          data,
        })
      : await prisma.animalLambing.create({
          data: {
            animalId: input.animalId,
            ...data,
          },
        });

  await syncLatestLambingDate(input.animalId);
  return { lambing };
}
