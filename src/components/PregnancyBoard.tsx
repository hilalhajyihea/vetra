"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type BreedingMethod = "" | "SPONGE" | "AI";

type FemaleRow = {
  id: string;
  number: string;
  pregnant: boolean;
  matingDate: string;
  lambingDate: string;
  checkup1Date: string;
  checkup2Date: string;
  breedingMethod: BreedingMethod;
};

type GroupRow = {
  id: string;
  name: string;
  pregnant: boolean;
  matingDate: string;
  lambingDate: string;
  checkup1Date: string;
  checkup2Date: string;
  females: FemaleRow[];
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

function cardClass(pregnant: boolean) {
  return pregnant
    ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-100"
    : "border-white/15 bg-black/20 text-[rgba(244,239,230,0.88)]";
}

export function PregnancyBoard({ locale, farmId }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<"group" | "number">("group");
  const [search, setSearch] = useState("");
  const [groupDrafts, setGroupDrafts] = useState<Record<string, GroupRow>>({});
  const [animalDrafts, setAnimalDrafts] = useState<Record<string, FemaleRow>>({});
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withFarm("/api/breeder/pregnancy", farmId));
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      const list: GroupRow[] = data.groups || [];
      setGroups(list);
      setGroupDrafts(Object.fromEntries(list.map((group) => [group.id, group])));
      setAnimalDrafts(
        Object.fromEntries(
          list.flatMap((group) =>
            group.females.map((animal) => [animal.id, animal]),
          ),
        ),
      );
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const animals = useMemo(
    () =>
      groups
        .flatMap((group) =>
          group.females.map((animal) => ({
            ...animal,
            groupName: group.name,
          })),
        )
        .sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true }),
        ),
    [groups],
  );

  const filteredAnimals = useMemo(() => {
    const q = search.trim();
    if (!q) return animals;
    return animals.filter((animal) => animal.number.includes(q));
  }, [animals, search]);

  async function save(
    target: "group" | "animal",
    id: string,
    payload: {
      pregnant: boolean;
      matingDate: string;
      lambingDate: string;
      checkup1Date: string;
      checkup2Date: string;
      breedingMethod?: BreedingMethod;
    },
  ) {
    setError("");
    setSavingId(id);
    const res = await fetch("/api/breeder/pregnancy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, id, farmId, ...payload }),
    });
    setSavingId("");
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  function saveGroup(e: FormEvent, groupId: string) {
    e.preventDefault();
    const draft = groupDrafts[groupId];
    if (!draft) return;
    save("group", groupId, draft);
  }

  function saveAnimal(e: FormEvent, animalId: string) {
    e.preventDefault();
    const draft = animalDrafts[animalId];
    if (!draft) return;
    save("animal", animalId, draft);
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, "pregnancyTitle")}
      </h1>

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

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? <p className="mt-4">{t(locale, "loading")}</p> : null}

      {!loading && sortMode === "group" && groups.length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "noGroups")}
        </p>
      ) : null}

      {!loading && sortMode === "number" && animals.length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "noPregnancyAnimals")}
        </p>
      ) : null}

      {!loading && sortMode === "group" ? (
        <ul className="mt-5 space-y-4">
          {groups.map((group) => {
            const draft = groupDrafts[group.id] || group;
            return (
              <li key={group.id}>
                <form
                  onSubmit={(e) => saveGroup(e, group.id)}
                  className={`rounded-2xl border px-4 py-4 ${cardClass(draft.pregnant)}`}
                >
                  <h2 className="font-display text-2xl">{group.name}</h2>
                  {group.females.length === 0 ? (
                    <p className="mt-2 text-sm opacity-80">
                      {t(locale, "noFemalesInGroup")}
                    </p>
                  ) : (
                    <>
                      <PregnancyFields
                        locale={locale}
                        value={draft}
                        onChange={(next) =>
                          setGroupDrafts((prev) => ({
                            ...prev,
                            [group.id]: { ...draft, ...next },
                          }))
                        }
                      />
                      <button
                        type="submit"
                        disabled={savingId === group.id}
                        className="btn-primary mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        {t(locale, "saveGroupPregnancy")}
                      </button>
                    </>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && sortMode === "number" && animals.length > 0 ? (
        <div className="mt-5">
          <input
            className="shop-field w-full max-w-md rounded-xl px-3 py-2.5"
            placeholder={t(locale, "searchNumber")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredAnimals.length === 0 ? (
            <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "noSearchResults")}
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {filteredAnimals.map((animal) => {
                const draft = animalDrafts[animal.id] || animal;
                return (
                  <li key={animal.id}>
                    <form
                      onSubmit={(e) => saveAnimal(e, animal.id)}
                      className={`rounded-2xl border px-4 py-4 ${cardClass(draft.pregnant)}`}
                    >
                      <p className="text-lg font-semibold">
                        {t(locale, "animalNumber")} {animal.number}
                      </p>
                      <p className="mt-1 text-sm opacity-75">{animal.groupName}</p>
                      <PregnancyFields
                        locale={locale}
                        value={draft}
                        onChange={(next) =>
                          setAnimalDrafts((prev) => ({
                            ...prev,
                            [animal.id]: { ...draft, ...next },
                          }))
                        }
                        showMethod
                      />
                      <button
                        type="submit"
                        disabled={savingId === animal.id}
                        className="btn-primary mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        {t(locale, "save")}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

type FieldValue = {
  pregnant: boolean;
  matingDate: string;
  lambingDate: string;
  checkup1Date: string;
  checkup2Date: string;
  breedingMethod?: BreedingMethod;
};

function PregnancyFields({
  locale,
  value,
  onChange,
  showMethod = false,
}: {
  locale: Locale;
  value: FieldValue;
  onChange: (next: Partial<FieldValue>) => void;
  showMethod?: boolean;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={value.pregnant}
          onChange={(e) => onChange({ pregnant: e.target.checked })}
        />
        {value.pregnant ? t(locale, "pregnantYes") : t(locale, "pregnantNo")}
      </label>
      {showMethod ? (
        <label className="text-sm">
          {t(locale, "breedingMethod")}
          <select
            className="shop-field mt-1 w-full rounded-xl px-3 py-2 text-sm"
            value={value.breedingMethod || ""}
            onChange={(e) =>
              onChange({ breedingMethod: e.target.value as BreedingMethod })
            }
          >
            <option value="">{t(locale, "breedingNone")}</option>
            <option value="SPONGE">{t(locale, "breedingSponge")}</option>
            <option value="AI">{t(locale, "breedingAi")}</option>
          </select>
        </label>
      ) : (
        <span />
      )}
      <DateField
        label={t(locale, "matingDate")}
        value={value.matingDate}
        onChange={(matingDate) => onChange({ matingDate })}
      />
      <DateField
        label={t(locale, "lambingDate")}
        value={value.lambingDate}
        onChange={(lambingDate) => onChange({ lambingDate })}
      />
      <DateField
        label={t(locale, "checkup1Date")}
        value={value.checkup1Date}
        onChange={(checkup1Date) => onChange({ checkup1Date })}
      />
      <DateField
        label={t(locale, "checkup2Date")}
        value={value.checkup2Date}
        onChange={(checkup2Date) => onChange({ checkup2Date })}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        type="date"
        className="shop-field mt-1 w-full rounded-xl px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
