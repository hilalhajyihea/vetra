"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIsraelDate } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

type VaccineStatus = "valid" | "expired" | "none";

type GroupRow = {
  id: string;
  name: string;
  status: VaccineStatus;
  date: string | null;
  count: number;
};

type AnimalRow = {
  id: string;
  number: string;
  groupId: string;
  groupName: string;
  validUntil: string;
  valid: boolean;
};

type VaccineCard = {
  id: string;
  name: string;
  description: string;
  status: VaccineStatus;
  date: string | null;
  groups: GroupRow[];
  animals: AnimalRow[];
};

type Props = {
  slug: string;
  locale: Locale;
  farmId?: string;
};

function withFarm(path: string, farmId?: string) {
  if (!farmId) return path;
  return `${path}?farmId=${encodeURIComponent(farmId)}`;
}

function statusClass(status: VaccineStatus | boolean) {
  const valid = status === true || status === "valid";
  if (status === "none") {
    return "border-white/15 bg-black/20 text-[rgba(244,239,230,0.78)]";
  }
  return valid
    ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-100"
    : "border-red-500/40 bg-red-950/70 text-red-100";
}

export function VaccinationsBoard({ locale, farmId }: Props) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState<VaccineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"group" | "number">("group");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withFarm("/api/breeder/vaccine-board", farmId));
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setVaccines(data.vaccines || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = vaccines.find((item) => item.id === selectedId) || null;

  const filteredAnimals = useMemo(() => {
    if (!selected) return [];
    const q = search.trim();
    const rows = q
      ? selected.animals.filter((animal) => animal.number.trim() === q)
      : selected.animals;
    return [...rows].sort((a, b) =>
      a.number.localeCompare(b.number, undefined, { numeric: true }),
    );
  }, [search, selected]);

  function statusLabel(status: VaccineStatus, date: string | null) {
    if (status === "none" || !date) return t(locale, "noVaccineRecords");
    return status === "valid"
      ? t(locale, "vaccineValidUntil", { date: formatIsraelDate(date) })
      : t(locale, "vaccineExpiredOn", { date: formatIsraelDate(date) });
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {selected ? selected.name : t(locale, "vaccinesTitle")}
      </h1>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? <p className="mt-4">{t(locale, "loading")}</p> : null}

      {!loading && !selected && vaccines.length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "noClinicVaccinesBreeder")}
        </p>
      ) : null}

      {!selected ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {vaccines.map((vaccine) => (
            <li key={vaccine.id} className="space-y-2">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 text-xs font-bold text-[var(--cream)]"
                aria-label={t(locale, "vaccineInfo")}
                onClick={() =>
                  setOpenInfo((prev) => (prev === vaccine.id ? null : vaccine.id))
                }
              >
                i
              </button>
              {openInfo === vaccine.id ? (
                <p className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm leading-relaxed text-[rgba(244,239,230,0.82)]">
                  {vaccine.description || t(locale, "noVaccineInfo")}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSelectedId(vaccine.id);
                  setSortMode("group");
                  setSearch("");
                  setOpenInfo(null);
                }}
                className={`w-full rounded-2xl border px-4 py-4 text-right transition ${statusClass(vaccine.status)}`}
              >
                <p className="text-lg font-semibold">{vaccine.name}</p>
                <p className="mt-2 text-sm">
                  {statusLabel(vaccine.status, vaccine.date)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            {t(locale, "backToVaccines")}
          </button>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSortMode("group")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                sortMode === "group"
                  ? "bg-[var(--teal)] text-[var(--cream)]"
                  : "border border-white/20"
              }`}
            >
              {t(locale, "sortByGroup")}
            </button>
            <button
              type="button"
              onClick={() => setSortMode("number")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                sortMode === "number"
                  ? "bg-[var(--teal)] text-[var(--cream)]"
                  : "border border-white/20"
              }`}
            >
              {t(locale, "sortByNumber")}
            </button>
          </div>

          {sortMode === "group" ? (
            selected.groups.length === 0 ? (
              <p className="mt-5 text-sm text-[rgba(244,239,230,0.62)]">
                {t(locale, "noVaccineRecords")}
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {selected.groups.map((group) => (
                  <li
                    key={group.id}
                    className={`rounded-2xl border px-4 py-4 ${statusClass(group.status)}`}
                  >
                    <p className="text-lg font-semibold">{group.name}</p>
                    <p className="mt-1 text-sm">
                      {statusLabel(group.status, group.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="mt-5">
              <input
                className="shop-field w-full max-w-md rounded-xl px-3 py-2.5"
                placeholder={t(locale, "searchNumber")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filteredAnimals.length === 0 ? (
                <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
                  {search.trim()
                    ? t(locale, "noSearchResults")
                    : t(locale, "noVaccineRecords")}
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[28rem] text-right text-sm">
                    <thead className="bg-black/30 text-[rgba(244,239,230,0.7)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">
                          {t(locale, "animalNumber")}
                        </th>
                        <th className="px-3 py-2 font-semibold">
                          {t(locale, "groupName")}
                        </th>
                        <th className="px-3 py-2 font-semibold">
                          {t(locale, "vaccineDate")}
                        </th>
                        <th className="px-3 py-2 font-semibold">
                          {t(locale, "vaccines")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnimals.map((animal) => (
                        <tr
                          key={animal.id}
                          className={statusClass(animal.valid)}
                        >
                          <td className="px-3 py-2 font-semibold">
                            {animal.number}
                          </td>
                          <td className="px-3 py-2">{animal.groupName}</td>
                          <td className="px-3 py-2">
                            {formatIsraelDate(animal.validUntil)}
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            {animal.valid
                              ? t(locale, "vaccineValid")
                              : t(locale, "vaccineExpired")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
