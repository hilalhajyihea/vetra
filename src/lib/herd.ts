import { t, type Locale } from "@/lib/i18n";

export const VACCINE_LIFETIME_UNTIL = "9999-12-31";

export function isLifetimeVaccineMonths(months: number) {
  return months <= 0;
}

export function isLifetimeValidUntil(value: Date | string | null | undefined) {
  if (!value) return false;
  return toDateKey(value) >= "9000-01-01";
}

export const GENE_TYPES = ["++", "+B", "BB"] as const;
export type GeneType = (typeof GENE_TYPES)[number];

export function isGeneType(value: string): value is GeneType {
  return (GENE_TYPES as readonly string[]).includes(value);
}

export function parseAnimalNumbers(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,;،]+/u)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function animalNumbersMatch(a: string, b: string) {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left === right) return true;
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    return Number(left) === Number(right);
  }
  return false;
}

export const VACCINE_SUGGESTIONS = [
  "פה וטלפיים",
  "דבר הבקר",
  "ברוצלוזיס",
  "כחול הלשון",
  "קדחת שלושת הימים",
  "מחלת ניוקאסל",
  "שפעת העופות",
  "אבעבועות כבשים",
];

export function jerusalemTodayKey() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
}

export function toDateKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

export function isVaccineValid(validUntil: Date | string) {
  return toDateKey(validUntil) >= jerusalemTodayKey();
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return toDateKey(value);
}

export function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${toDateKey(value)}T00:00:00.000Z`);
}

export function addDaysToDateKey(dateKey: Date | string, days: number) {
  const [year, month, day] = toDateKey(dateKey).split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

export function addMonthsToDateKey(dateKey: string, months: number) {
  const [year, month, day] = toDateKey(dateKey).split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  const result = new Date(Date.UTC(year, targetMonthIndex, safeDay));
  return result.toISOString().slice(0, 10);
}

export function validUntilFromGiven(givenAt: Date | string, months: number) {
  if (isLifetimeVaccineMonths(months)) return VACCINE_LIFETIME_UNTIL;
  return addMonthsToDateKey(toDateKey(givenAt), months);
}

export type VaccineTypePlan = {
  validMonths: number;
  boosterEnabled: boolean;
  boosterAfterDays: number;
};

export function usesBoosterProtocol(type: VaccineTypePlan) {
  return (
    type.boosterEnabled &&
    !isLifetimeVaccineMonths(type.validMonths) &&
    type.boosterAfterDays > 0
  );
}

export function dateFromKey(key: string) {
  return new Date(`${toDateKey(key)}T00:00:00.000Z`);
}

export function vaccinationSchedule(
  type: VaccineTypePlan,
  givenAt: Date | string,
  existing: { courseStage?: string | null } | null,
) {
  const given = toDateKey(givenAt);
  if (usesBoosterProtocol(type) && !existing) {
    const due = addDaysToDateKey(given, type.boosterAfterDays);
    return {
      courseStage: "PRIME" as const,
      boosterDueAt: dateFromKey(due),
      validUntil: dateFromKey(due),
    };
  }
  return {
    courseStage: "COMPLETE" as const,
    boosterDueAt: null,
    validUntil: dateFromKey(validUntilFromGiven(given, type.validMonths)),
  };
}

export function rescheduleExistingVaccination(
  type: VaccineTypePlan,
  record: { givenAt: Date | string | null; courseStage: string },
) {
  if (!record.givenAt) return null;
  if (record.courseStage === "PRIME" && usesBoosterProtocol(type)) {
    const due = addDaysToDateKey(toDateKey(record.givenAt), type.boosterAfterDays);
    return {
      courseStage: "PRIME" as const,
      boosterDueAt: dateFromKey(due),
      validUntil: dateFromKey(due),
    };
  }
  return {
    courseStage: "COMPLETE" as const,
    boosterDueAt: null,
    validUntil: dateFromKey(validUntilFromGiven(record.givenAt, type.validMonths)),
  };
}

export function formatVaccineUntil(
  locale: Locale,
  value: Date | string | null | undefined,
) {
  if (!value) return "";
  if (isLifetimeValidUntil(value)) return t(locale, "vaccineLifetimeUntil");
  return formatIsraelDate(value);
}

export function formatIsraelDate(value: Date | string) {
  const key = toDateKey(value);
  const [year, month, day] = key.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
}

export function formatIsraelDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return formatIsraelDate(value);
  const datePart = date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

export type VaccineStatus = "valid" | "expired" | "none";

export function summarizeVaccineDates(dates: Array<Date | string>): {
  status: VaccineStatus;
  date: string | null;
} {
  if (!dates.length) return { status: "none", date: null };
  const rows = dates.map((value) => ({
    key: toDateKey(value),
    valid: isVaccineValid(value),
  }));
  const expired = rows.filter((row) => !row.valid);
  if (expired.length) {
    return {
      status: "expired",
      date: expired.reduce(
        (earliest, row) => (row.key < earliest ? row.key : earliest),
        expired[0].key,
      ),
    };
  }
  return {
    status: "valid",
    date: rows.reduce(
      (earliest, row) => (row.key < earliest ? row.key : earliest),
      rows[0].key,
    ),
  };
}

export function latestVaccination<T extends { validUntil: Date | string }>(
  records: T[],
) {
  if (!records.length) return null;
  return records.reduce((best, current) =>
    toDateKey(current.validUntil) > toDateKey(best.validUntil) ? current : best,
  );
}

export function ageParts(birthDate: Date | string) {
  const birth = toDateKey(birthDate);
  const today = jerusalemTodayKey();
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let years = ty - by;
  let months = tm - bm;
  if (td < bd) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0 };
  return { years, months };
}

export function formatAge(locale: Locale, birthDate: Date | string) {
  const { years, months } = ageParts(birthDate);
  if (locale === "ar") {
    if (years <= 0) return `${months} أشهر`;
    if (months <= 0) return `${years} سنوات`;
    return `${years} سنوات و${months} أشهر`;
  }
  if (years <= 0) return `${months} חודשים`;
  if (months <= 0) return `${years} שנים`;
  return `${years} שנים ו־${months} חודשים`;
}
