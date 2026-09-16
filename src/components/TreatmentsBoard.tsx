"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLocale } from "@/components/LocaleProvider";
import { formatIsraelDateTime } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

type HealthNote = {
  id: string;
  body: string;
  author: "vet" | "breeder";
  createdAt: string;
  updatedAt: string;
};

type AnimalRow = {
  id: string;
  number: string;
  sex: string;
  groupId: string;
  groupName: string;
  notes: HealthNote[];
};

type GroupRow = {
  id: string;
  name: string;
  count: number;
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

function previewNote(animal: AnimalRow) {
  return animal.notes[0]?.body.trim() || "";
}

export function TreatmentsBoard({ locale: localeProp, farmId }: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<"group" | "number">("group");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openAnimalId, setOpenAnimalId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(withFarm("/api/breeder/treatments", farmId));
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || null;

  const animals = useMemo(() => {
    const rows = groups.flatMap((group) => group.animals);
    rows.sort((a, b) =>
      a.number.localeCompare(b.number, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    return rows;
  }, [groups]);

  const tableAnimals = useMemo(() => {
    let rows =
      sortMode === "group" && selectedGroupId
        ? animals.filter((animal) => animal.groupId === selectedGroupId)
        : animals;
    const q = search.trim();
    if (sortMode === "number" && q) {
      rows = rows.filter((animal) => animal.number.includes(q));
    }
    return rows;
  }, [animals, search, selectedGroupId, sortMode]);

  const openAnimal =
    animals.find((animal) => animal.id === openAnimalId) || null;

  function authorLabel(author: HealthNote["author"]) {
    return author === "vet"
      ? t(locale, "authorVet")
      : t(locale, "authorBreeder");
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!openAnimal || !draft.trim()) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/breeder/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId: openAnimal.id,
          body: draft.trim(),
          farmId,
        }),
      });
      if (!res.ok) {
        setError(t(locale, "updateFailed"));
        return;
      }
      setDraft("");
      await load({ silent: true });
    } catch {
      setError(t(locale, "updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(noteId: string) {
    if (!editDraft.trim()) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/breeder/treatments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteId,
          body: editDraft.trim(),
          farmId,
        }),
      });
      if (!res.ok) {
        setError(t(locale, "updateFailed"));
        return;
      }
      setEditingId(null);
      setEditDraft("");
      await load({ silent: true });
    } catch {
      setError(t(locale, "updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: HealthNote) {
    if (!window.confirm(t(locale, "confirmDeleteTreatment"))) return;
    setError("");
    const params = new URLSearchParams({ id: note.id });
    if (farmId) params.set("farmId", farmId);
    const res = await fetch(`/api/breeder/treatments?${params}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load({ silent: true });
  }

  function openAnimalNotes(animal: AnimalRow) {
    setOpenAnimalId(animal.id);
    setDraft("");
    setEditingId(null);
    setEditDraft("");
  }

  function treatmentsCell(animal: AnimalRow) {
    const preview = previewNote(animal);
    return (
      <button
        type="button"
        onClick={() => openAnimalNotes(animal)}
        className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-right text-sm hover:bg-black/30"
      >
        <p className="font-semibold">{t(locale, "treatmentsField")}</p>
        <p className="mt-1 line-clamp-2 text-[rgba(244,239,230,0.75)]">
          {preview || t(locale, "noTreatments")}
        </p>
        {animal.notes.length > 0 ? (
          <p className="mt-1 text-xs opacity-70">
            {t(locale, "treatmentCount", { count: animal.notes.length })}
          </p>
        ) : null}
      </button>
    );
  }

  function renderAnimalList(showGroup: boolean) {
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
      <>
        <ul className="mt-4 space-y-3 md:hidden">
          {tableAnimals.map((animal) => (
            <li
              key={animal.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
            >
              <p className="text-lg font-semibold">
                {t(locale, "animalNumber")} {animal.number}
              </p>
              {showGroup ? (
                <p className="mt-1 text-sm opacity-75">{animal.groupName}</p>
              ) : null}
              <p className="mt-1 text-sm opacity-75">
                {animal.sex === "FEMALE"
                  ? t(locale, "sexFemale")
                  : t(locale, "sexMale")}
              </p>
              <div className="mt-3">{treatmentsCell(animal)}</div>
            </li>
          ))}
        </ul>
        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
          <table className="w-full min-w-[32rem] text-right text-sm">
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
                <th className="px-3 py-2 font-semibold">{t(locale, "sex")}</th>
                <th className="px-3 py-2 font-semibold">
                  {t(locale, "treatmentsField")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableAnimals.map((animal) => (
                <tr
                  key={animal.id}
                  className="border-t border-white/10 align-top even:bg-black/15"
                >
                  <td className="px-3 py-3 text-base font-semibold">
                    {animal.number}
                  </td>
                  {showGroup ? (
                    <td className="px-3 py-3">{animal.groupName}</td>
                  ) : null}
                  <td className="px-3 py-3">
                    {animal.sex === "FEMALE"
                      ? t(locale, "sexFemale")
                      : t(locale, "sexMale")}
                  </td>
                  <td className="px-3 py-3">{treatmentsCell(animal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, "treatmentsTitle")}
      </h1>
      {sortMode === "group" && selectedGroup ? (
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

      {!loading && groups.length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "noGroups")}
        </p>
      ) : null}

      {!loading && groups.length > 0 ? (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2">
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

          {sortMode === "group" && !selectedGroupId ? (
            <ul className="mt-5 space-y-3">
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-4 text-right"
                  >
                    <p className="font-display text-2xl text-[var(--cream)]">
                      {group.name}
                    </p>
                    <p className="mt-1 text-sm text-[rgba(244,239,230,0.7)]">
                      {t(locale, "groupCount", { count: group.count })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
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
              {renderAnimalList(sortMode === "number")}
            </div>
          )}
        </div>
      ) : null}

      {openAnimal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="surface-dark max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl text-[var(--cream)]">
                  {t(locale, "animalNumber")} {openAnimal.number}
                </h2>
                <p className="mt-1 text-sm text-[rgba(244,239,230,0.7)]">
                  {openAnimal.groupName}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-white/20 px-3 py-1.5 text-sm"
                onClick={() => setOpenAnimalId(null)}
              >
                {t(locale, "closeTreatments")}
              </button>
            </div>

            <form onSubmit={addNote} className="mt-4">
              <textarea
                className="shop-field min-h-24 w-full rounded-xl px-3 py-2.5 text-sm"
                placeholder={t(locale, "treatmentPlaceholder")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={saving || !draft.trim()}
                className="btn-primary mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto"
              >
                {t(locale, "addTreatment")}
              </button>
            </form>

            {openAnimal.notes.length === 0 ? (
              <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
                {t(locale, "noTreatments")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {openAnimal.notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                  >
                    <p className="text-xs text-[rgba(244,239,230,0.65)]">
                      {authorLabel(note.author)}
                      {" · "}
                      {formatIsraelDateTime(note.createdAt)}
                      {note.updatedAt !== note.createdAt
                        ? ` · ${t(locale, "treatmentEdited")}`
                        : ""}
                    </p>
                    {editingId === note.id ? (
                      <div className="mt-2">
                        <textarea
                          className="shop-field min-h-20 w-full rounded-xl px-3 py-2 text-sm"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving || !editDraft.trim()}
                            className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
                            onClick={() => saveEdit(note.id)}
                          >
                            {t(locale, "save")}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            {t(locale, "cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {note.body}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                            onClick={() => {
                              setEditingId(note.id);
                              setEditDraft(note.body);
                            }}
                          >
                            {t(locale, "editTreatment")}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-200"
                            onClick={() => deleteNote(note)}
                          >
                            {t(locale, "deleteTreatment")}
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
