"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLocale } from "@/components/LocaleProvider";
import { formatAge, formatIsraelDate, isVaccineValid } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

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
  birthDate: string;
  pregnant: boolean;
  vaccinations: Vaccine[];
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
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [number, setNumber] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE">("FEMALE");
  const [birthDate, setBirthDate] = useState("");
  const [pregnant, setPregnant] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
  const [vaccineDrafts, setVaccineDrafts] = useState<
    Record<string, { vaccineTypeId: string; givenAt: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
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
    if (!q) return allAnimals;
    return allAnimals.filter((animal) => animal.number.includes(q));
  }, [allAnimals, search]);

  const emptyGroups = useMemo(
    () => groups.filter((group) => group.animals.length === 0),
    [groups],
  );

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
    const res = await fetch("/api/breeder/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        number,
        sex,
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
    setPregnant(false);
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
          <section className="surface-dark overflow-hidden rounded-2xl">
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
              <div className="overflow-x-auto">
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
                        {t(locale, "age")}
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        {t(locale, "birthDate")}
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        {t(locale, "pregnant")}
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
                          <div className="flex flex-wrap items-center gap-2">
                            {farmId &&
                            animal.vaccinations.some(
                              (v) => v.status === "PENDING",
                            ) ? (
                              <button
                                type="button"
                                className="rounded-lg border border-[var(--hay)]/40 px-2 py-0.5 text-xs font-semibold text-[var(--hay)]"
                                onClick={() =>
                                  approveVaccines({ animalId: animal.id })
                                }
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
                                    {v.givenAt
                                      ? ` · ${formatIsraelDate(v.givenAt)}`
                                      : ""}
                                    {` · ${formatIsraelDate(v.validUntil)}`}
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
                                      onClick={() =>
                                        approveVaccines({ id: v.id })
                                      }
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
                              className="mt-2 flex flex-wrap items-end gap-2"
                            >
                              <select
                                className="shop-field min-w-32 rounded-lg px-2 py-1.5 text-xs"
                                value={
                                  vaccineDrafts[animal.id]?.vaccineTypeId || ""
                                }
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
                                <option value="">
                                  {t(locale, "vaccineName")}
                                </option>
                                {vaccineTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                    {type.validMonths
                                      ? ` (${type.validMonths} ${t(locale, "vaccineMonthsUnit")})`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                className="shop-field rounded-lg px-2 py-1.5 text-xs"
                                value={vaccineDrafts[animal.id]?.givenAt || ""}
                                onChange={(e) =>
                                  setVaccineDrafts((prev) => ({
                                    ...prev,
                                    [animal.id]: {
                                      vaccineTypeId:
                                        prev[animal.id]?.vaccineTypeId || "",
                                      givenAt: e.target.value,
                                    },
                                  }))
                                }
                                required
                              />
                              <button
                                type="submit"
                                className="btn-primary rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                              >
                                {t(locale, "addVaccine")}
                              </button>
                            </form>
                          )}
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
            )}
          </section>
        ) : null}

        {!loading && emptyGroups.length > 0 ? (
          <section className="mt-4 surface-dark rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-[rgba(244,239,230,0.7)]">
              {t(locale, "emptyGroups")}
            </h2>
            <ul className="mt-3 space-y-2">
              {emptyGroups.map((group) => (
                <li
                  key={group.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>{group.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteGroup(group)}
                    className="rounded-xl border border-red-400/30 px-3 py-1.5 text-sm text-red-200"
                  >
                    {t(locale, "deleteGroup")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
