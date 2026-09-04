"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale } from "@/lib/i18n";

type Vaccine = {
  id: string;
  name: string;
  description: string;
  validMonths: number;
};

export function VaccineCatalogEditor({ locale: localeProp }: { locale: Locale }) {
  const locale = useUiLocale(localeProp);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validMonths, setValidMonths] = useState(12);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMonths, setEditMonths] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vet/vaccines");
      const data = await res.json();
      setVaccines(data.vaccines || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  async function addVaccine(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/vet/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, validMonths }),
    });
    if (res.status === 409) {
      setError(t(locale, "errVaccineTaken"));
      return;
    }
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    setName("");
    setDescription("");
    setValidMonths(12);
    load();
  }

  async function saveEdit(id: string) {
    setError("");
    const res = await fetch("/api/vet/vaccines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editName,
        description: editDescription,
        validMonths: editMonths,
      }),
    });
    if (res.status === 409) {
      setError(t(locale, "errVaccineTaken"));
      return;
    }
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/vet/vaccines?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "clinicVaccines")}
      </h2>
      <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "clinicVaccinesLead")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form onSubmit={addVaccine} className="surface-dark mt-4 rounded-2xl p-4">
        <input
          className="shop-field w-full rounded-xl px-3 py-2.5"
          placeholder={t(locale, "vaccineName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="shop-field mt-2 min-h-24 w-full rounded-xl px-3 py-2.5"
          placeholder={t(locale, "vaccineDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="mt-2 block text-sm">
          {t(locale, "vaccineValidMonths")}
          <input
            type="number"
            min={1}
            max={60}
            className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            value={validMonths}
            onChange={(e) => setValidMonths(Number(e.target.value) || 1)}
            required
          />
        </label>
        <button
          type="submit"
          className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          {t(locale, "addClinicVaccine")}
        </button>
      </form>

      {loading ? <p className="mt-4 text-sm">{t(locale, "loading")}</p> : null}
      {!loading && vaccines.length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "noClinicVaccines")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {vaccines.map((vaccine) => (
            <li key={vaccine.id} className="surface-dark rounded-2xl p-4">
              {editingId === vaccine.id ? (
                <div className="grid gap-2">
                  <input
                    className="shop-field rounded-xl px-3 py-2.5"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <textarea
                    className="shop-field min-h-20 rounded-xl px-3 py-2.5"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <label className="text-sm">
                    {t(locale, "vaccineValidMonths")}
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
                      value={editMonths}
                      onChange={(e) => setEditMonths(Number(e.target.value) || 1)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                      onClick={() => saveEdit(vaccine.id)}
                    >
                      {t(locale, "save")}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t(locale, "cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-semibold">{vaccine.name}</p>
                  <p className="mt-1 text-sm text-[rgba(244,239,230,0.62)]">
                    {t(locale, "vaccineValidMonths")}: {vaccine.validMonths}{" "}
                    {t(locale, "vaccineMonthsUnit")}
                  </p>
                  <p className="mt-1 text-sm text-[rgba(244,239,230,0.62)]">
                    {vaccine.description || t(locale, "noVaccineInfo")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="shop-chip rounded-xl px-4 py-2 text-sm"
                      onClick={() => {
                        setEditingId(vaccine.id);
                        setEditName(vaccine.name);
                        setEditDescription(vaccine.description);
                        setEditMonths(vaccine.validMonths || 12);
                      }}
                    >
                      {t(locale, "editVaccine")}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-200"
                      onClick={() => remove(vaccine.id)}
                    >
                      {t(locale, "deleteVaccine")}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
