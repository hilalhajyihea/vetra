import { jerusalemTodayKey, toDateKey } from "@/lib/herd";

export type LambingRecord = {
  id: string;
  lambedAt: string;
  bornCount: number;
  aliveCount: number;
  note: string;
};

export type LambingYearStat = {
  year: string;
  born: number;
  lambings: number;
};

export type LambingSummary = {
  lambingCount: number;
  bornTotal: number;
  aliveTotal: number;
  avgBorn: number;
  perYear: number;
  byYear: LambingYearStat[];
};

export function normalizeLambingCounts(bornCount: number, aliveCount?: number | null) {
  const born = Math.round(Number(bornCount));
  const alive =
    aliveCount === undefined || aliveCount === null || Number.isNaN(Number(aliveCount))
      ? born
      : Math.round(Number(aliveCount));
  return { bornCount: born, aliveCount: alive };
}

export function lambingCountsAreValid(bornCount: number, aliveCount: number) {
  return (
    Number.isFinite(bornCount) &&
    Number.isFinite(aliveCount) &&
    bornCount >= 1 &&
    bornCount <= 12 &&
    aliveCount >= 0 &&
    aliveCount <= bornCount
  );
}

function daysBetween(startKey: string, endKey: string) {
  const [ay, am, ad] = startKey.split("-").map(Number);
  const [by, bm, bd] = endKey.split("-").map(Number);
  const start = Date.UTC(ay, am - 1, ad);
  const end = Date.UTC(by, bm - 1, bd);
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function summarizeLambings(
  records: Array<{ lambedAt: Date | string; bornCount: number; aliveCount: number }>,
  today = jerusalemTodayKey(),
): LambingSummary {
  const rows = records.map((record) => ({
    key: toDateKey(record.lambedAt),
    year: toDateKey(record.lambedAt).slice(0, 4),
    bornCount: record.bornCount,
    aliveCount: record.aliveCount,
  }));
  if (!rows.length) {
    return {
      lambingCount: 0,
      bornTotal: 0,
      aliveTotal: 0,
      avgBorn: 0,
      perYear: 0,
      byYear: [],
    };
  }

  const bornTotal = rows.reduce((sum, row) => sum + row.bornCount, 0);
  const aliveTotal = rows.reduce((sum, row) => sum + row.aliveCount, 0);
  const first = [...rows.map((row) => row.key)].sort()[0];
  const fertileYears = Math.max(1, daysBetween(first, today) / 365.25);
  const byYearMap = new Map<string, LambingYearStat>();
  for (const row of rows) {
    const current = byYearMap.get(row.year) || {
      year: row.year,
      born: 0,
      lambings: 0,
    };
    current.born += row.bornCount;
    current.lambings += 1;
    byYearMap.set(row.year, current);
  }

  return {
    lambingCount: rows.length,
    bornTotal,
    aliveTotal,
    avgBorn: bornTotal / rows.length,
    perYear: bornTotal / fertileYears,
    byYear: [...byYearMap.values()].sort((a, b) => b.year.localeCompare(a.year)),
  };
}

export function formatLambingStat(value: number) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function serializeLambing(record: {
  id: string;
  lambedAt: Date | string;
  bornCount: number;
  aliveCount: number;
  note?: string | null;
}): LambingRecord {
  return {
    id: record.id,
    lambedAt: toDateKey(record.lambedAt),
    bornCount: record.bornCount,
    aliveCount: record.aliveCount,
    note: record.note || "",
  };
}
