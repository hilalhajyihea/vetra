"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAge, formatIsraelDate, isVaccineValid } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

type Vaccine = {
  id: string;
  name: string;
  validUntil: string;
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

type VaccineType = {
  id: string;
  name: string;
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

export function HerdManager({ locale, farmId }: Props) {
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
    Record<string, { vaccineTypeId: string; validUntil: string }>
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

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        animals: g.animals.filter((a) => a.number.includes(q)),
      }))
      .filter((g) => g.animals.length > 0);
  }, [groups, search]);

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

  async function addVaccine(animalId: string, e: FormEvent) {
    e.preventDefault();
    const draft = vaccineDrafts[animalId];
    if (!draft?.vaccineTypeId || !draft.validUntil) return;
    setError("");
    const res = await fetch("/api/breeder/vaccinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animalId,
        vaccineTypeId: draft.vaccineTypeId,
        validUntil: draft.validUntil,
        farmId,
      }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    setVaccineDrafts((prev) => ({
      ...prev,
      [animalId]: { vaccineTypeId: "", validUntil: "" },
    }));
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, "herdTitle")}
      </h1>

      <input
        className="shop-field mt-5 w-full max-w-md rounded-xl px-3 py-2.5"
        placeholder={t(locale, "searchNumber")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
                  {t(locale, "pregnantYes")}
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

      <div className="mt-8 space-y-4">
        {loading ? <p>{t(locale, "loading")}</p> : null}
        {!loading && groups.length === 0 ? (
          <p className="text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "noGroups")}
          </p>
        ) : null}
        {!loading && search.trim() && filtered.length === 0 ? (
          <p className="text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "noSearchResults")}
          </p>
        ) : null}

        {filtered.map((group) => (
          <section key={group.id} className="surface-dark rounded-2xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl text-[var(--cream)]">
                {group.name}
              </h2>
              <p className="text-sm text-[rgba(244,239,230,0.55)]">
                {t(locale, "groupCount", { count: group.animals.length })}
              </p>
            </div>
            {group.animals.length === 0 ? (
              <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
                {t(locale, "noAnimals")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {group.animals.map((animal) => (
                  <li
                    key={animal.id}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
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
                        {animal.sex === "FEMALE" ? (
                          <label className="mt-2 flex items-center gap-2 text-sm">
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
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold">{t(locale, "vaccines")}</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {animal.vaccinations.map((v) => {
                          const valid = isVaccineValid(v.validUntil);
                          return (
                            <li
                              key={v.id}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                valid
                                  ? "bg-emerald-900/70 text-emerald-200"
                                  : "bg-red-900/70 text-red-200"
                              }`}
                            >
                              {v.name} · {formatIsraelDate(v.validUntil)} ·{" "}
                              {valid
                                ? t(locale, "vaccineValid")
                                : t(locale, "vaccineExpired")}
                            </li>
                          );
                        })}
                      </ul>
                      {vaccineTypes.length === 0 ? (
                        <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
                          {t(locale, "needClinicVaccine")}
                        </p>
                      ) : (
                        <form
                          onSubmit={(e) => addVaccine(animal.id, e)}
                          className="mt-3 flex flex-wrap items-end gap-2"
                        >
                          <select
                            className="shop-field min-w-36 flex-1 rounded-xl px-3 py-2 text-sm"
                            value={vaccineDrafts[animal.id]?.vaccineTypeId || ""}
                            onChange={(e) =>
                              setVaccineDrafts((prev) => ({
                                ...prev,
                                [animal.id]: {
                                  vaccineTypeId: e.target.value,
                                  validUntil: prev[animal.id]?.validUntil || "",
                                },
                              }))
                            }
                            required
                          >
                            <option value="">{t(locale, "vaccineName")}</option>
                            {vaccineTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            className="shop-field rounded-xl px-3 py-2 text-sm"
                            value={vaccineDrafts[animal.id]?.validUntil || ""}
                            onChange={(e) =>
                              setVaccineDrafts((prev) => ({
                                ...prev,
                                [animal.id]: {
                                  vaccineTypeId:
                                    prev[animal.id]?.vaccineTypeId || "",
                                  validUntil: e.target.value,
                                },
                              }))
                            }
                            required
                          />
                          <button
                            type="submit"
                            className="btn-primary rounded-xl px-3 py-2 text-sm font-semibold"
                          >
                            {t(locale, "addVaccine")}
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
