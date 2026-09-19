import {
  isVaccineValid,
  jerusalemTodayKey,
  latestVaccination,
  toDateKey,
} from "@/lib/herd";

export type VaccineRecord = {
  id: string;
  name: string;
  vaccineTypeId: string | null;
  validUntil: Date | string;
  givenAt?: Date | string | null;
  status?: string | null;
  courseStage?: string | null;
  boosterDueAt?: Date | string | null;
};

export type BoardStatus = "valid" | "expired" | "booster" | "none";

export function recordMatchesType(
  record: VaccineRecord,
  type: { id: string; name: string },
) {
  if (record.vaccineTypeId && record.vaccineTypeId === type.id) return true;
  return record.name.trim() === type.name.trim();
}

export function animalRecordForType(
  records: VaccineRecord[],
  type: { id: string; name: string },
) {
  return latestVaccination(records.filter((record) => recordMatchesType(record, type)));
}

export function vaccinationBoardStatus(
  record:
    | {
        validUntil: Date | string;
        courseStage?: string | null;
        boosterDueAt?: Date | string | null;
      }
    | null
    | undefined,
): { status: BoardStatus; date: string | null; needsBooster: boolean } {
  if (!record) return { status: "none", date: null, needsBooster: false };
  if (record.courseStage === "PRIME") {
    const due = record.boosterDueAt || record.validUntil;
    const key = toDateKey(due);
    return {
      status: key < jerusalemTodayKey() ? "expired" : "booster",
      date: key,
      needsBooster: true,
    };
  }
  if (isVaccineValid(record.validUntil)) {
    return {
      status: "valid",
      date: toDateKey(record.validUntil),
      needsBooster: false,
    };
  }
  return {
    status: "expired",
    date: toDateKey(record.validUntil),
    needsBooster: false,
  };
}

export function summarizeBoardStatuses(
  rows: Array<{ status: BoardStatus; date: string | null }>,
): { status: BoardStatus; date: string | null } {
  const present = rows.filter((row) => row.status !== "none");
  if (!present.length) return { status: "none", date: null };

  function earliest(status: BoardStatus) {
    const matches = present.filter((row) => row.status === status && row.date);
    if (!matches.length) return null;
    return matches.reduce((best, row) =>
      (row.date || "") < (best.date || "") ? row : best,
    );
  }

  const expired = earliest("expired");
  if (expired) return { status: "expired", date: expired.date };
  const booster = earliest("booster");
  if (booster) return { status: "booster", date: booster.date };
  const valid = earliest("valid");
  if (valid) return { status: "valid", date: valid.date };
  return { status: "none", date: null };
}

export function boardStatusForDates(dates: Array<Date | string>) {
  const rows = dates.map((value) => vaccinationBoardStatus({ validUntil: value }));
  return summarizeBoardStatuses(rows);
}

export function serializeVaccineDate(value: Date | string) {
  return toDateKey(value);
}

export function isRecordValid(record: { validUntil: Date | string }) {
  return isVaccineValid(record.validUntil);
}
