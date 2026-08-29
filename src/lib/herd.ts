import type { Locale } from "@/lib/i18n";

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

export function formatIsraelDate(value: Date | string) {
  const key = toDateKey(value);
  const [year, month, day] = key.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
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
