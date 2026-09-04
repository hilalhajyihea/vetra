"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLocale } from "@/components/LocaleProvider";
import { formatIsraelDate } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

type PendingVaccine = {
  id: string;
  name: string;
  givenAt: string;
  validUntil: string;
  animalId: string;
  animalNumber: string;
  groupName: string;
  breederId: string;
  breederName: string;
  farmName: string;
};

type AnimalGroup = {
  animalId: string;
  animalNumber: string;
  groupName: string;
  vaccines: PendingVaccine[];
};

type FarmGroup = {
  breederId: string;
  breederName: string;
  farmName: string;
  animals: AnimalGroup[];
};

function groupPending(records: PendingVaccine[]): FarmGroup[] {
  const farms = new Map<string, FarmGroup>();
  for (const record of records) {
    let farm = farms.get(record.breederId);
    if (!farm) {
      farm = {
        breederId: record.breederId,
        breederName: record.breederName,
        farmName: record.farmName,
        animals: [],
      };
      farms.set(record.breederId, farm);
    }
    let animal = farm.animals.find((item) => item.animalId === record.animalId);
    if (!animal) {
      animal = {
        animalId: record.animalId,
        animalNumber: record.animalNumber,
        groupName: record.groupName,
        vaccines: [],
      };
      farm.animals.push(animal);
    }
    animal.vaccines.push(record);
  }
  return Array.from(farms.values());
}

export function VetVaccineApprovals({ locale: localeProp }: { locale: Locale }) {
  const locale = useUiLocale(localeProp);
  const [records, setRecords] = useState<PendingVaccine[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vet/vaccine-approvals");
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  const farms = useMemo(() => groupPending(records), [records]);

  async function approve(body: { id?: string; animalId?: string; all?: boolean }) {
    if (
      body.all &&
      !window.confirm(t(locale, "confirmApproveAllVaccines"))
    ) {
      return;
    }
    setError("");
    setMessage("");
    const res = await fetch("/api/vet/vaccine-approvals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (typeof data.count === "number") {
      setMessage(t(locale, "vaccineApprovedCount", { count: data.count }));
    }
    load();
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-[var(--cream)]">
            {t(locale, "vaccineApprovalsTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "vaccineApprovalsLead")}
          </p>
        </div>
        {records.length > 0 ? (
          <button
            type="button"
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            onClick={() => approve({ all: true })}
          >
            {t(locale, "vaccineApproveAll")}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--hay)]">{message}</p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm">{t(locale, "loading")}</p>
      ) : records.length === 0 ? (
        <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "vaccineNoPendingApprovals")}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {farms.map((farm) => (
            <li key={farm.breederId} className="surface-dark rounded-2xl p-4">
              <p className="font-semibold">
                {farm.breederName}
                <span className="ms-2 text-sm font-normal text-[rgba(244,239,230,0.62)]">
                  {farm.farmName}
                </span>
              </p>
              <ul className="mt-3 space-y-3">
                {farm.animals.map((animal) => (
                  <li
                    key={animal.animalId}
                    className="rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {t(locale, "animalNumber")} {animal.animalNumber}
                        <span className="ms-2 font-normal text-[rgba(244,239,230,0.62)]">
                          {animal.groupName}
                        </span>
                      </p>
                      <button
                        type="button"
                        className="rounded-xl border border-[var(--hay)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--hay)]"
                        onClick={() => approve({ animalId: animal.animalId })}
                      >
                        {t(locale, "vaccineApproveAnimal")}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {animal.vaccines.map((vaccine) => (
                        <li
                          key={vaccine.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {vaccine.name}
                            {vaccine.givenAt ? (
                              <>
                                {" · "}
                                {t(locale, "vaccineGiven")}:{" "}
                                {formatIsraelDate(vaccine.givenAt)}
                              </>
                            ) : null}
                            {" · "}
                            {t(locale, "vaccineUntil")}:{" "}
                            {formatIsraelDate(vaccine.validUntil)}
                            {" · "}
                            {t(locale, "vaccinePending")}
                          </span>
                          <button
                            type="button"
                            className="btn-primary rounded-lg px-3 py-1 text-xs font-semibold"
                            onClick={() => approve({ id: vaccine.id })}
                          >
                            {t(locale, "approve")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
