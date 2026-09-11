"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLocale } from "@/components/LocaleProvider";
import { formatIsraelDate, jerusalemTodayKey } from "@/lib/herd";
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
  givenAt: string | null;
  validUntil: string | null;
  valid: boolean;
  pending: boolean;
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

function statusClass(animal: Pick<AnimalRow, "valid" | "pending" | "validUntil">) {
  if (animal.pending) {
    return "border-amber-500/40 bg-amber-950/70 text-[var(--hay)]";
  }
  if (!animal.validUntil) {
    return "border-white/15 bg-black/20 text-[rgba(244,239,230,0.78)]";
  }
  return animal.valid
    ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-100"
    : "border-red-500/40 bg-red-950/70 text-red-100";
}

function groupStatusClass(status: VaccineStatus) {
  if (status === "none") {
    return "border-white/15 bg-black/20 text-[rgba(244,239,230,0.78)]";
  }
  return status === "valid"
    ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-100"
    : "border-red-500/40 bg-red-950/70 text-red-100";
}

export function VaccinationsBoard({ locale: localeProp, farmId }: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();
  const [vaccines, setVaccines] = useState<VaccineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"group" | "number">("group");
  const [search, setSearch] = useState("");
  const [givenDrafts, setGivenDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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
  const selectedGroup =
    selected?.groups.find((group) => group.id === selectedGroupId) || null;
  const today = jerusalemTodayKey();

  const tableAnimals = useMemo(() => {
    const card = vaccines.find((item) => item.id === selectedId);
    if (!card) return [];
    const q = search.trim();
    let rows = card.animals;
    if (sortMode === "group" && selectedGroupId) {
      rows = rows.filter((animal) => animal.groupId === selectedGroupId);
    }
    if (sortMode === "number" && q) {
      rows = rows.filter((animal) => animal.number.includes(q));
    }
    return [...rows].sort((a, b) =>
      a.number.localeCompare(b.number, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [search, selectedGroupId, selectedId, sortMode, vaccines]);

  function statusLabel(status: VaccineStatus, date: string | null) {
    if (status === "none" || !date) return t(locale, "noVaccineRecords");
    return status === "valid"
      ? t(locale, "vaccineValidUntil", { date: formatIsraelDate(date) })
      : t(locale, "vaccineExpiredOn", { date: formatIsraelDate(date) });
  }

  function animalStatusLabel(animal: AnimalRow) {
    if (animal.pending) return t(locale, "vaccinePending");
    if (!animal.validUntil) return t(locale, "vaccineNotGiven");
    return animal.valid
      ? t(locale, "vaccineValid")
      : t(locale, "vaccineExpired");
  }

  async function renewVaccine(animal: AnimalRow) {
    if (!selected) return;
    const givenAt = givenDrafts[animal.id] || today;
    setError("");
    setSavingId(animal.id);
    try {
      const res = await fetch("/api/breeder/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId: animal.id,
          vaccineTypeId: selected.id,
          givenAt,
          farmId,
        }),
      });
      if (!res.ok) {
        setError(t(locale, "updateFailed"));
        return;
      }
      await load({ silent: true });
    } catch {
      setError(t(locale, "updateFailed"));
    } finally {
      setSavingId("");
    }
  }

  function renderAnimalTable(showGroup: boolean) {
    if (tableAnimals.length === 0) {
      return (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {sortMode === "number" && search.trim()
            ? t(locale, "noSearchResults")
            : t(locale, "noAnimals")}
        </p>
      );
    }
    return (
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[36rem] text-right text-sm">
          <thead className="bg-black/30 text-[rgba(244,239,230,0.7)]">
            <tr>
              <th className="px-3 py-2 font-semibold">
                {t(locale, "animalNumber")}
              </th>
              {showGroup ? (
                <th className="px-3 py-2 font-semibold">
                  {t(locale, "groupName")}
                </th>
              ) : null}
              <th className="px-3 py-2 font-semibold">
                {t(locale, "vaccineGiven")}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t(locale, "vaccineUntil")}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t(locale, "vaccines")}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t(locale, "renewVaccine")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableAnimals.map((animal) => (
              <tr key={animal.id} className={statusClass(animal)}>
                <td className="px-3 py-2 font-semibold">{animal.number}</td>
                {showGroup ? (
                  <td className="px-3 py-2">{animal.groupName}</td>
                ) : null}
                <td className="px-3 py-2">
                  {animal.givenAt
                    ? formatIsraelDate(animal.givenAt)
                    : t(locale, "vaccineNotGiven")}
                </td>
                <td className="px-3 py-2">
                  {animal.validUntil
                    ? formatIsraelDate(animal.validUntil)
                    : "—"}
                </td>
                <td className="px-3 py-2 font-semibold">
                  {animalStatusLabel(animal)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="shop-field rounded-lg px-2 py-1.5 text-xs"
                      value={givenDrafts[animal.id] || today}
                      onChange={(e) =>
                        setGivenDrafts((prev) => ({
                          ...prev,
                          [animal.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-primary rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                      disabled={savingId === animal.id}
                      onClick={() => renewVaccine(animal)}
                    >
                      {savingId === animal.id
                        ? t(locale, "renewingVaccine")
                        : animal.validUntil
                          ? t(locale, "renewVaccine")
                          : t(locale, "addVaccine")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {selected ? selected.name : t(locale, "vaccinesTitle")}
      </h1>
      {selected && selectedGroup ? (
        <p className="mt-2 text-sm text-[rgba(244,239,230,0.7)]">
          {selectedGroup.name}
          {" · "}
          {t(locale, "groupCount", { count: selectedGroup.count })}
        </p>
      ) : null}

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
                  setSelectedGroupId(null);
                  setSortMode("group");
                  setSearch("");
                  setOpenInfo(null);
                }}
                className={`w-full rounded-2xl border px-4 py-4 text-right transition ${groupStatusClass(vaccine.status)}`}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setSelectedGroupId(null);
                setSearch("");
              }}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm"
            >
              {t(locale, "backToVaccines")}
            </button>
            {sortMode === "group" && selectedGroupId ? (
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                {t(locale, "backToGroups")}
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSortMode("group");
                setSelectedGroupId(null);
                setSearch("");
              }}
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
              onClick={() => {
                setSortMode("number");
                setSelectedGroupId(null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                sortMode === "number"
                  ? "bg-[var(--teal)] text-[var(--cream)]"
                  : "border border-white/20"
              }`}
            >
              {t(locale, "sortByNumber")}
            </button>
          </div>

          {sortMode === "group" && !selectedGroupId ? (
            selected.groups.length === 0 ? (
              <p className="mt-5 text-sm text-[rgba(244,239,230,0.62)]">
                {t(locale, "noGroups")}
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {selected.groups.map((group) => (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-right ${groupStatusClass(group.status)}`}
                    >
                      <p className="text-lg font-semibold">{group.name}</p>
                      <p className="mt-1 text-sm">
                        {statusLabel(group.status, group.date)}
                      </p>
                      <p className="mt-1 text-sm text-[rgba(244,239,230,0.7)]">
                        {t(locale, "groupCount", { count: group.count })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="mt-5">
              {sortMode === "number" ? (
                <input
                  className="shop-field w-full max-w-md rounded-xl px-3 py-2.5"
                  placeholder={t(locale, "searchNumber")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              ) : null}
              {renderAnimalTable(sortMode === "number")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
