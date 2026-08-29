import {
  isVaccineValid,
  latestVaccination,
  summarizeVaccineDates,
  toDateKey,
} from "@/lib/herd";

export type VaccineRecord = {
  id: string;
  name: string;
  vaccineTypeId: string | null;
  validUntil: Date | string;
};

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

export function boardStatusForDates(dates: Array<Date | string>) {
  const summary = summarizeVaccineDates(dates);
  return {
    status: summary.status,
    date: summary.date,
    valid: summary.status === "valid",
  };
}

export function serializeVaccineDate(value: Date | string) {
  return toDateKey(value);
}

export function isRecordValid(record: { validUntil: Date | string }) {
  return isVaccineValid(record.validUntil);
}
