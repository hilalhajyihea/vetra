"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLocale } from "@/components/LocaleProvider";
import {
  formatAge,
  formatIsraelDate,
  formatVaccineUntil,
  GENE_TYPES,
  isGeneType,
  isLifetimeVaccineMonths,
  isVaccineValid,
  jerusalemTodayKey,
  toDateKey,
  type GeneType,
} from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";
import {
  formatLambingStat,
  serializeLambing,
  summarizeLambings,
  type LambingRecord,
} from "@/lib/lambing";

type Vaccine = {
  id: string;
  name: string;
  givenAt?: string | null;
  validUntil: string;
  status?: string;
};

type Animal = {
  id: string;
  number: string;
  sex: string;
  geneType?: string;
  birthDate: string;
  pregnant: boolean;
  vaccinations: Vaccine[];
  lambings?: LambingRecord[];
};

type Group = {
  id: string;
  name: string;
  animals: Animal[];
};

type AnimalRow = Animal & { groupId: string; groupName: string };

function compareAnimalNumber(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function lambingRatio(animal: Animal) {
  if (animal.sex !== "FEMALE") return -1;
  return summarizeLambings((animal.lambings || []).map(serializeLambing)).perYear;
}

function geneRank(animal: Animal) {
  const gene = animal.geneType || "";
  const index = GENE_TYPES.indexOf(gene as GeneType);
  return index === -1 ? GENE_TYPES.length : index;
}

type VaccineType = {
  id: string;
  name: string;
  validMonths?: number;
};

type Props = {
  slug: string;
  locale: Locale;
  farmId?: string;
};

function withFarm(path: string, farmId?: string) {
  if (!farmId) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}farmId=${encodeURIComponent(farmId)}`;
}

export function HerdManager({ locale: localeProp, farmId }: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<
    "group" | "number" | "age" | "pregnant" | "lambing" | "gene"
  >("group");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [number, setNumber] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE">("FEMALE");
  const [geneType, setGeneType] = useState<"" | GeneType>("");
  const [birthDate, setBirthDate] = useState("");
  const [pregnant, setPregnant] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
  const [vaccineDrafts, setVaccineDrafts] = useState<
    Record<string, { vaccineTypeId: string; givenAt: string }>
  >({});
  const [openLambingId, setOpenLambingId] = useState<string | null>(null);
  const [savingLambingId, setSavingLambingId] = useState("");
  const [lambingDrafts, setLambingDrafts] = useState<
    Record<
      string,
      { lambedAt: string; bornCount: string; aliveCount: string; note: string }
    >
  >({});

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [groupsRes, typesRes] = await Promise.all([
        fetch(withFarm("/api/breeder/groups", farmId)),
        fetch(withFarm("/api/breeder/vaccine-types", farmId)),
      ]);
      if (groupsRes.status === 401 || typesRes.status === 401) {
        router.refresh();
        return;
      }
      const data = await groupsRes.json();
      const typesData = await typesRes.json();
      const list: Group[] = data.groups || [];
      setGroups(list);
      setVaccineTypes(typesData.vaccines || []);
      setGroupId((prev) => prev || list[0]?.id || "");
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const allAnimals = useMemo(() => {
    const rows: AnimalRow[] = [];
    for (const group of groups) {
      for (const animal of group.animals) {
        rows.push({ ...animal, groupId: group.id, groupName: group.name });
      }
    }
    rows.sort((a, b) => compareAnimalNumber(a.number, b.number));
    return rows;
  }, [groups]);

  const filteredAnimals = useMemo(() => {
    const q = search.trim();
    const rows = (q
      ? allAnimals.filter((animal) => animal.number.includes(q))
      : allAnimals
    ).slice();
    if (sortMode === "age") {
      rows.sort(
        (a, b) =>
          toDateKey(a.birthDate).localeCompare(toDateKey(b.birthDate)) ||
          compareAnimalNumber(a.number, b.number),
      );
    } else if (sortMode === "pregnant") {
      rows.sort((a, b) => {
        const aPregnant = a.sex === "FEMALE" && a.pregnant ? 1 : 0;
        const bPregnant = b.sex === "FEMALE" && b.pregnant ? 1 : 0;
        return bPregnant - aPregnant || compareAnimalNumber(a.number, b.number);
      });
    } else if (sortMode === "lambing") {
      rows.sort(
        (a, b) =>
          lambingRatio(b) - lambingRatio(a) ||
          compareAnimalNumber(a.number, b.number),
      );
    } else if (sortMode === "gene") {
      rows.sort(
        (a, b) =>
          geneRank(a) - geneRank(b) ||
          compareAnimalNumber(a.number, b.number),
      );
    } else {
      rows.sort((a, b) => compareAnimalNumber(a.number, b.number));
    }
    return rows;
  }, [allAnimals, search, sortMode]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || null;

  async function addGroup(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/breeder/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName, farmId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(locale, "createFailed"));
      return;
    }
    setGroupName("");
    await load();
    if (data.group?.id) setGroupId(data.group.id);
  }

  async function addAnimal(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!groupId) {
      setError(t(locale, "needGroupFirst"));
      return;
    }
    if (!isGeneType(geneType)) {
      setError(t(locale, "geneTypeChoose"));
      return;
    }
    const res = await fetch("/api/breeder/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        number,
        sex,
        geneType,
        birthDate,
        pregnant: sex === "FEMALE" ? pregnant : false,
        farmId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "NUMBER_TAKEN") {
        setError(t(locale, "errNumberTaken"));
        return;
      }
      if (data.error === "BIRTH_FUTURE") {
        setError(t(locale, "errBirthFuture"));
        return;
      }
      setError(data.error || t(locale, "createFailed"));
      return;
    }
    setNumber("");
    setGeneType("");
    setPregnant(false);
    load();
  }

  async function setAnimalGeneType(animal: Animal, next: GeneType) {
    setError("");
    const res = await fetch("/api/breeder/animals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: animal.id, geneType: next, farmId }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  async function togglePregnant(animal: Animal, next: boolean) {
    setError("");
    const res = await fetch("/api/breeder/animals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: animal.id, pregnant: next, farmId }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  async function deleteAnimal(animal: Animal) {
    if (!window.confirm(t(locale, "confirmDeleteAnimal", { number: animal.number }))) {
      return;
    }
    setError("");
    const params = new URLSearchParams({ id: animal.id });
    if (farmId) params.set("farmId", farmId);
    const res = await fetch(`/api/breeder/animals?${params}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  async function deleteGroup(group: Group) {
    if (group.animals.length > 0) {
      setError(t(locale, "errGroupNotEmpty"));
      return;
    }
    if (!window.confirm(t(locale, "confirmDeleteGroup", { name: group.name }))) {
      return;
    }
    setError("");
    const params = new URLSearchParams({ id: group.id });
    if (farmId) params.set("farmId", farmId);
    const res = await fetch(`/api/breeder/groups?${params}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "GROUP_NOT_EMPTY"
          ? t(locale, "errGroupNotEmpty")
          : t(locale, "updateFailed"),
      );
      return;
    }
    if (groupId === group.id) setGroupId("");
    if (selectedGroupId === group.id) setSelectedGroupId(null);
    load();
  }

  async function addVaccine(animalId: string, e: FormEvent) {
    e.preventDefault();
    const draft = vaccineDrafts[animalId];
    if (!draft?.vaccineTypeId || !draft.givenAt) return;
    setError("");
    const res = await fetch("/api/breeder/vaccinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animalId,
        vaccineTypeId: draft.vaccineTypeId,
        givenAt: draft.givenAt,
        farmId,
      }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    setVaccineDrafts((prev) => ({
      ...prev,
      [animalId]: { vaccineTypeId: "", givenAt: "" },
    }));
    load();
  }

  async function approveVaccines(body: { id?: string; animalId?: string }) {
    setError("");
    const res = await fetch("/api/vet/vaccine-approvals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  function animalLambings(animal: Animal): LambingRecord[] {
    return (animal.lambings || []).map((row) => serializeLambing(row));
  }

  function lambingDraft(animalId: string) {
    return (
      lambingDrafts[animalId] || {
        lambedAt: jerusalemTodayKey(),
        bornCount: "1",
        aliveCount: "",
        note: "",
      }
    );
  }

  function lambingError(code: string) {
    if (code === "LAMBING_FUTURE") return t(locale, "errLambingFuture");
    if (code === "LAMBING_COUNTS") return t(locale, "errLambingCounts");
    return t(locale, "updateFailed");
  }

  async function addLambing(animalId: string, e: FormEvent) {
    e.preventDefault();
    const draft = lambingDraft(animalId);
    setError("");
    setSavingLambingId(animalId);
    try {
      const res = await fetch("/api/breeder/lambings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId,
          lambedAt: draft.lambedAt,
          bornCount: Number(draft.bornCount),
          aliveCount: draft.aliveCount ? Number(draft.aliveCount) : undefined,
          note: draft.note,
          farmId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(lambingError(data.error || ""));
        return;
      }
      setLambingDrafts((prev) => ({
        ...prev,
        [animalId]: {
          lambedAt: jerusalemTodayKey(),
          bornCount: "1",
          aliveCount: "",
          note: "",
        },
      }));
      await load({ silent: true });
    } catch {
      setError(t(locale, "updateFailed"));
    } finally {
      setSavingLambingId("");
    }
  }

  async function deleteLambing(record: LambingRecord) {
    if (
      !window.confirm(
        t(locale, "confirmDeleteLambing", {
          date: formatIsraelDate(record.lambedAt),
        }),
      )
    ) {
      return;
    }
    setError("");
    const params = new URLSearchParams({ id: record.id });
    if (farmId) params.set("farmId", farmId);
    const res = await fetch(`/api/breeder/lambings?${params}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load({ silent: true });
  }

  async function deleteVaccineRecord(vaccine: Vaccine) {
    if (!window.confirm(t(locale, "confirmDeleteAnimalVaccine", { name: vaccine.name }))) {
      return;
    }
    setError("");
    const params = new URLSearchParams({ id: vaccine.id });
    if (farmId) params.set("farmId", farmId);
    const res = await fetch(`/api/breeder/vaccinations?${params}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  function renderVaccines(animal: Animal) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {farmId &&
          animal.vaccinations.some((v) => v.status === "PENDING") ? (
            <button
              type="button"
              className="rounded-lg border border-[var(--hay)]/40 px-2 py-0.5 text-xs font-semibold text-[var(--hay)]"
              onClick={() => approveVaccines({ animalId: animal.id })}
            >
              {t(locale, "vaccineApproveAnimal")}
            </button>
          ) : null}
        </div>
        <ul className="mt-1 flex flex-col gap-1">
          {animal.vaccinations.map((v) => {
            const pending = v.status === "PENDING";
            const valid = isVaccineValid(v.validUntil);
            return (
              <li
                key={v.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ${
                  pending
                    ? "bg-amber-900/70 text-[var(--hay)]"
                    : valid
                      ? "bg-emerald-900/70 text-emerald-200"
                      : "bg-red-900/70 text-red-200"
                }`}
              >
                <span>
                  {v.name}
                  {v.givenAt ? ` · ${formatIsraelDate(v.givenAt)}` : ""}
                  {` · ${formatVaccineUntil(locale, v.validUntil)}`}
                  {` · ${
                    pending
                      ? t(locale, "vaccinePending")
                      : valid
                        ? t(locale, "vaccineValid")
                        : t(locale, "vaccineExpired")
                  }`}
                </span>
                {farmId && pending ? (
                  <button
                    type="button"
                    onClick={() => approveVaccines({ id: v.id })}
                    className="rounded-md border border-[var(--hay)]/50 px-1.5 py-0.5 text-[11px]"
                  >
                    {t(locale, "approve")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deleteVaccineRecord(v)}
                  className="rounded-md border border-white/20 px-1.5 py-0.5 text-[11px]"
                >
                  {t(locale, "deleteVaccine")}
                </button>
              </li>
            );
          })}
        </ul>
        {vaccineTypes.length === 0 ? (
          <p className="mt-2 text-xs text-[rgba(244,239,230,0.62)]">
            {t(locale, "needClinicVaccine")}
          </p>
        ) : (
          <form
            onSubmit={(e) => addVaccine(animal.id, e)}
            className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <select
              className="shop-field w-full min-w-32 rounded-lg px-2 py-1.5 text-xs sm:w-auto"
              value={vaccineDrafts[animal.id]?.vaccineTypeId || ""}
              onChange={(e) =>
                setVaccineDrafts((prev) => ({
                  ...prev,
                  [animal.id]: {
                    vaccineTypeId: e.target.value,
                    givenAt: prev[animal.id]?.givenAt || "",
                  },
                }))
              }
              required
            >
              <option value="">{t(locale, "vaccineName")}</option>
              {vaccineTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {isLifetimeVaccineMonths(type.validMonths ?? 1)
                    ? ` (${t(locale, "vaccineLifetime")})`
                    : ` (${type.validMonths} ${t(locale, "vaccineMonthsUnit")})`}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="shop-field w-full rounded-lg px-2 py-1.5 text-xs sm:w-auto"
              value={vaccineDrafts[animal.id]?.givenAt || ""}
              onChange={(e) =>
                setVaccineDrafts((prev) => ({
                  ...prev,
                  [animal.id]: {
                    vaccineTypeId: prev[animal.id]?.vaccineTypeId || "",
                    givenAt: e.target.value,
                  },
                }))
              }
              required
            />
            <button
              type="submit"
              className="btn-primary w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:w-auto"
            >
              {t(locale, "addVaccine")}
            </button>
          </form>
        )}
      </>
    );
  }

  function renderLambingHistory(animal: Animal) {
    if (animal.sex !== "FEMALE") return null;
    const records = animalLambings(animal);
    const summary = summarizeLambings(records);
    const open = openLambingId === animal.id;
    const draft = lambingDraft(animal.id);
    return (
      <div>
        <p className="text-sm font-semibold">{t(locale, "lambingHistory")}</p>
        {summary.lambingCount === 0 ? (
          <p className="mt-1 text-xs text-[rgba(244,239,230,0.62)]">
            {t(locale, "noLambings")}
          </p>
        ) : (
          <div className="mt-1 text-sm">
            <p>
              {t(locale, "lambingSummary", {
                lambings: summary.lambingCount,
                born: summary.bornTotal,
                perYear: formatLambingStat(summary.perYear),
              })}
            </p>
            <p className="mt-1 text-xs text-[rgba(244,239,230,0.75)]">
              {t(locale, "lambingAvg", {
                avg: formatLambingStat(summary.avgBorn),
              })}
            </p>
            {summary.byYear.map((row) => (
              <p
                key={row.year}
                className="text-xs text-[rgba(244,239,230,0.75)]"
              >
                {t(locale, "lambingYearLine", {
                  year: row.year,
                  born: row.born,
                })}
              </p>
            ))}
          </div>
        )}
        <button
          type="button"
          className="mt-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold"
          onClick={() =>
            setOpenLambingId((prev) => (prev === animal.id ? null : animal.id))
          }
        >
          {open ? t(locale, "cancel") : t(locale, "addLambing")}
        </button>
        {open ? (
          <div className="mt-3 space-y-3">
            {records.length > 0 ? (
              <ul className="space-y-2">
                {records.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
                  >
                    <p className="font-semibold">
                      {formatIsraelDate(record.lambedAt)}
                      {" · "}
                      {record.bornCount} {t(locale, "lambingBorn")}
                      {" · "}
                      {record.aliveCount} {t(locale, "lambingAlive")}
                    </p>
                    {record.note ? (
                      <p className="mt-1 text-[rgba(244,239,230,0.7)]">
                        {record.note}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-2 rounded-md border border-white/20 px-2 py-1"
                      onClick={() => deleteLambing(record)}
                    >
                      {t(locale, "deleteLambing")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              onSubmit={(e) => addLambing(animal.id, e)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="text-xs">
                {t(locale, "lambingDate")}
                <input
                  type="date"
                  required
                  className="shop-field mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                  value={draft.lambedAt}
                  onChange={(e) =>
                    setLambingDrafts((prev) => ({
                      ...prev,
                      [animal.id]: { ...draft, lambedAt: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="text-xs">
                {t(locale, "lambingBorn")}
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  className="shop-field mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                  value={draft.bornCount}
                  onChange={(e) =>
                    setLambingDrafts((prev) => ({
                      ...prev,
                      [animal.id]: { ...draft, bornCount: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="text-xs">
                {t(locale, "lambingAlive")}
                <input
                  type="number"
                  min={0}
                  max={12}
                  className="shop-field mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                  value={draft.aliveCount}
                  onChange={(e) =>
                    setLambingDrafts((prev) => ({
                      ...prev,
                      [animal.id]: { ...draft, aliveCount: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="text-xs sm:col-span-2">
                {t(locale, "lambingNote")}
                <input
                  className="shop-field mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                  value={draft.note}
                  onChange={(e) =>
                    setLambingDrafts((prev) => ({
                      ...prev,
                      [animal.id]: { ...draft, note: e.target.value },
                    }))
                  }
                />
              </label>
              <button
                type="submit"
                disabled={savingLambingId === animal.id}
                className="btn-primary w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:col-span-2 sm:w-auto"
              >
                {t(locale, "addLambing")}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  function renderAnimalCard(animal: Animal) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {t(locale, "animalNumber")} {animal.number}
            </p>
            <p className="mt-1 text-sm text-[rgba(244,239,230,0.7)]">
              {animal.sex === "FEMALE"
                ? t(locale, "sexFemale")
                : t(locale, "sexMale")}
              {" · "}
              {t(locale, "age")}: {formatAge(locale, animal.birthDate)}
            </p>
            <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {t(locale, "geneType")}
              <select
                className="shop-field rounded-lg px-2 py-1.5 text-sm"
                value={isGeneType(animal.geneType || "") ? animal.geneType : ""}
                onChange={(e) => {
                  if (isGeneType(e.target.value)) {
                    setAnimalGeneType(animal, e.target.value);
                  }
                }}
                required
              >
                <option value="" disabled>
                  {t(locale, "geneTypeChoose")}
                </option>
                {GENE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            {animal.sex === "FEMALE" ? (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={animal.pregnant}
                  onChange={(e) => togglePregnant(animal, e.target.checked)}
                />
                {t(locale, "pregnant")}
              </label>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => deleteAnimal(animal)}
            className="w-full rounded-xl border border-red-400/30 px-3 py-1.5 text-sm text-red-200 sm:w-auto"
          >
            {t(locale, "deleteAnimal")}
          </button>
        </div>
        {animal.sex === "FEMALE" ? (
          <div className="mt-4">{renderLambingHistory(animal)}</div>
        ) : null}
        <div className="mt-4">
          <p className="text-sm font-semibold">{t(locale, "vaccines")}</p>
          {renderVaccines(animal)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, "herdTitle")}
      </h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={addGroup} className="surface-dark rounded-2xl p-4">
          <h2 className="font-semibold">{t(locale, "addGroup")}</h2>
          <input
            className="shop-field mt-3 w-full rounded-xl px-3 py-2.5"
            placeholder={t(locale, "groupName")}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm font-semibold">
            {t(locale, "addGroup")}
          </button>
        </form>

        <form onSubmit={addAnimal} className="surface-dark rounded-2xl p-4">
          <h2 className="font-semibold">{t(locale, "addAnimal")}</h2>
          {groups.length === 0 ? (
            <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "needGroupFirst")}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              <select
                className="shop-field rounded-xl px-3 py-2.5"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <input
                className="shop-field rounded-xl px-3 py-2.5"
                placeholder={t(locale, "animalNumber")}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
              <select
                className="shop-field rounded-xl px-3 py-2.5"
                value={sex}
                onChange={(e) => {
                  const next = e.target.value as "MALE" | "FEMALE";
                  setSex(next);
                  if (next === "MALE") setPregnant(false);
                }}
              >
                <option value="FEMALE">{t(locale, "sexFemale")}</option>
                <option value="MALE">{t(locale, "sexMale")}</option>
              </select>
              <label className="text-sm">
                {t(locale, "geneType")}
                <select
                  className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
                  value={geneType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setGeneType(isGeneType(next) ? next : "");
                  }}
                  required
                >
                  <option value="" disabled>
                    {t(locale, "geneTypeChoose")}
                  </option>
                  {GENE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {t(locale, "birthDate")}
                <input
                  type="date"
                  className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </label>
              {sex === "FEMALE" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pregnant}
                    onChange={(e) => setPregnant(e.target.checked)}
                  />
                  {t(locale, "pregnant")}
                </label>
              ) : null}
              <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
                {t(locale, "addAnimal")}
              </button>
            </div>
          )}
        </form>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        {loading ? <p>{t(locale, "loading")}</p> : null}
        {!loading && groups.length === 0 ? (
          <p className="text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "noGroups")}
          </p>
        ) : null}

        {!loading && groups.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                onClick={() => {
                  setSortMode("age");
                  setSelectedGroupId(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sortMode === "age"
                    ? "bg-[var(--teal)] text-[var(--cream)]"
                    : "border border-white/20"
                }`}
              >
                {t(locale, "sortByAge")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortMode("pregnant");
                  setSelectedGroupId(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sortMode === "pregnant"
                    ? "bg-[var(--teal)] text-[var(--cream)]"
                    : "border border-white/20"
                }`}
              >
                {t(locale, "sortByPregnant")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortMode("lambing");
                  setSelectedGroupId(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sortMode === "lambing"
                    ? "bg-[var(--teal)] text-[var(--cream)]"
                    : "border border-white/20"
                }`}
              >
                {t(locale, "sortByLambing")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortMode("gene");
                  setSelectedGroupId(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sortMode === "gene"
                    ? "bg-[var(--teal)] text-[var(--cream)]"
                    : "border border-white/20"
                }`}
              >
                {t(locale, "sortByGene")}
              </button>
            </div>

            {sortMode === "group" && !selectedGroup ? (
              <ul className="mt-5 space-y-3">
                {groups.map((group) => (
                  <li key={group.id} className="surface-dark rounded-2xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className="flex-1 text-right"
                      >
                        <h2 className="font-display text-2xl text-[var(--cream)]">
                          {group.name}
                        </h2>
                        <p className="text-sm text-[rgba(244,239,230,0.55)]">
                          {t(locale, "groupCount", {
                            count: group.animals.length,
                          })}
                        </p>
                      </button>
                      {group.animals.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => deleteGroup(group)}
                          className="rounded-xl border border-red-400/30 px-3 py-1.5 text-sm text-red-200"
                        >
                          {t(locale, "deleteGroup")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : sortMode === "group" && selectedGroup ? (
              <section className="surface-dark mt-5 rounded-2xl p-5">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                >
                  {t(locale, "backToGroups")}
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--cream)]">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-sm text-[rgba(244,239,230,0.55)]">
                      {t(locale, "groupCount", {
                        count: selectedGroup.animals.length,
                      })}
                    </p>
                  </div>
                  {selectedGroup.animals.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => deleteGroup(selectedGroup)}
                      className="rounded-xl border border-red-400/30 px-3 py-1.5 text-sm text-red-200"
                    >
                      {t(locale, "deleteGroup")}
                    </button>
                  ) : null}
                </div>
                {selectedGroup.animals.length === 0 ? (
                  <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
                    {t(locale, "noAnimals")}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {selectedGroup.animals.map((animal) => (
                      <li
                        key={animal.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-4"
                      >
                        {renderAnimalCard(animal)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <section className="surface-dark mt-5 overflow-hidden rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <p className="text-sm text-[rgba(244,239,230,0.7)]">
                    {t(locale, "herdAllCount", { count: allAnimals.length })}
                  </p>
                  <input
                    className="shop-field w-full max-w-xs rounded-xl px-3 py-2 text-sm"
                    placeholder={t(locale, "searchNumber")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {filteredAnimals.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[rgba(244,239,230,0.62)]">
                    {search.trim()
                      ? t(locale, "noSearchResults")
                      : t(locale, "noAnimals")}
                  </p>
                ) : (
                  <>
                    <ul className="space-y-3 p-4 md:hidden">
                      {filteredAnimals.map((animal) => (
                        <li
                          key={animal.id}
                          className="rounded-xl border border-white/10 bg-black/20 p-4"
                        >
                          <p className="mb-3 text-sm text-[rgba(244,239,230,0.7)]">
                            {animal.groupName}
                          </p>
                          {renderAnimalCard(animal)}
                        </li>
                      ))}
                    </ul>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[56rem] text-right text-sm">
                        <thead className="bg-black/30 text-[rgba(244,239,230,0.7)]">
                          <tr>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "animalNumber")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "groupName")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "sex")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "geneType")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "age")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "birthDate")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "pregnant")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "lambingHistory")}
                            </th>
                            <th className="px-3 py-2 font-semibold">
                              {t(locale, "vaccines")}
                            </th>
                            <th className="px-3 py-2 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAnimals.map((animal) => (
                            <tr
                              key={animal.id}
                              className="border-t border-white/10 align-top even:bg-black/15"
                            >
                              <td className="px-3 py-3 text-base font-semibold">
                                {animal.number}
                              </td>
                              <td className="px-3 py-3">{animal.groupName}</td>
                              <td className="px-3 py-3">
                                {animal.sex === "FEMALE"
                                  ? t(locale, "sexFemale")
                                  : t(locale, "sexMale")}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <select
                                  className="shop-field rounded-lg px-2 py-1.5 text-sm"
                                  value={
                                    isGeneType(animal.geneType || "")
                                      ? animal.geneType
                                      : ""
                                  }
                                  onChange={(e) => {
                                    if (isGeneType(e.target.value)) {
                                      setAnimalGeneType(animal, e.target.value);
                                    }
                                  }}
                                  required
                                >
                                  <option value="" disabled>
                                    {t(locale, "geneTypeChoose")}
                                  </option>
                                  {GENE_TYPES.map((value) => (
                                    <option key={value} value={value}>
                                      {value}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {formatAge(locale, animal.birthDate)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {formatIsraelDate(animal.birthDate)}
                              </td>
                              <td className="px-3 py-3">
                                {animal.sex === "FEMALE" ? (
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={animal.pregnant}
                                      onChange={(e) =>
                                        togglePregnant(animal, e.target.checked)
                                      }
                                    />
                                    {animal.pregnant
                                      ? t(locale, "pregnantYes")
                                      : t(locale, "pregnantNo")}
                                  </label>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {animal.sex === "FEMALE"
                                  ? renderLambingHistory(animal)
                                  : "—"}
                              </td>
                              <td className="px-3 py-3">
                                {renderVaccines(animal)}
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => deleteAnimal(animal)}
                                  className="rounded-xl border border-red-400/30 px-3 py-1.5 text-xs text-red-200"
                                >
                                  {t(locale, "deleteAnimal")}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
