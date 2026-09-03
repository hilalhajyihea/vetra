"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LOCALE_STORAGE_KEY, normalizeLocale, t, type Locale } from "@/lib/i18n";

type VetRow = {
  id: string;
  slug: string;
  displayName: string;
  clinicName: string | null;
  username: string;
  isActive: boolean;
  phone: string | null;
  createdAt: string;
  whatsappEnabled: boolean;
  whatsappMonthlyLimit: number;
  whatsappUsed: number;
};

export function PlatformAdminPanel() {
  const router = useRouter();
  const [uiLocale, setUiLocale] = useState<Locale>("he");
  const [vets, setVets] = useState<VetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [waLimits, setWaLimits] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setUiLocale(normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/vets");
      if (res.status === 401) {
        router.push("/platform/login");
        return;
      }
      const data = await res.json();
      const list: VetRow[] = data.vets || [];
      setVets(list);
      setWaLimits(
        Object.fromEntries(
          list.map((vet) => [vet.id, String(vet.whatsappMonthlyLimit ?? 0)]),
        ),
      );
    } catch {
      setError(t(uiLocale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [router, uiLocale]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/platform/login");
  }

  async function createVet(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/platform/vets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        displayName,
        clinicName,
        username,
        password,
        phone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(uiLocale, "createFailed"));
      return;
    }
    setMessage(t(uiLocale, "createdVet", { slug: data.vet.slug }));
    setSlug("");
    setDisplayName("");
    setClinicName("");
    setUsername("");
    setPassword("");
    setPhone("");
    load();
  }

  async function patchVet(
    id: string,
    body: Record<string, unknown>,
    okMsg: string,
  ) {
    const res = await fetch("/api/platform/vets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      setError(t(uiLocale, "updateFailed"));
      return;
    }
    setMessage(okMsg);
    load();
  }

  async function resetPassword(vet: VetRow) {
    const next = prompt(t(uiLocale, "resetPassword"));
    if (!next || next.length < 6) {
      if (next != null) setError(t(uiLocale, "passwordMin"));
      return;
    }
    await patchVet(vet.id, { password: next }, t(uiLocale, "passwordUpdated"));
  }

  async function deleteVet(vet: VetRow) {
    const ok = confirm(t(uiLocale, "confirmDelete", { name: vet.displayName }));
    if (!ok) return;
    const typed = prompt(
      t(uiLocale, "confirmDeleteType", { name: vet.displayName }),
    );
    if (typed !== vet.displayName) {
      if (typed != null) setError(t(uiLocale, "deleteMismatch"));
      return;
    }
    setError("");
    const res = await fetch("/api/platform/vets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vet.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(uiLocale, "updateFailed"));
      return;
    }
    setMessage(t(uiLocale, "vetDeleted", { name: vet.displayName }));
    load();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" lang={uiLocale} dir="rtl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <BrandMark tone="light" />
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle locale={uiLocale} onChange={setUiLocale} />
          <Link
            href="/"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            {t(uiLocale, "backHome")}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            {t(uiLocale, "logout")}
          </button>
        </div>
      </div>

      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(uiLocale, "platformTitle")}
      </h1>
      <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
        {t(uiLocale, "platformLead")}
      </p>

      <form
        onSubmit={createVet}
        className="surface-dark mt-8 grid gap-3 rounded-2xl p-5 sm:grid-cols-2"
      >
        <h2 className="font-semibold sm:col-span-2">{t(uiLocale, "newVet")}</h2>
        <input
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldSlug")}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
        />
        <input
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldDisplayName")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldClinic")}
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
        />
        <input
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldPhone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldUsername")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="shop-field rounded-xl px-3 py-2.5"
          placeholder={t(uiLocale, "fieldPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button
          type="submit"
          className="btn-primary rounded-xl py-2.5 font-semibold sm:col-span-2"
        >
          {t(uiLocale, "addVet")}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--hay)]">{message}</p>
      ) : null}

      <div className="mt-8 space-y-3">
        {loading ? <p>{t(uiLocale, "loading")}</p> : null}
        {vets.map((vet) => (
          <div
            key={vet.id}
            className="surface-dark flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">
                {vet.displayName}
                {vet.clinicName ? (
                  <span className="mr-2 text-sm font-normal text-[rgba(244,239,230,0.62)]">
                    · {vet.clinicName}
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-[rgba(244,239,230,0.62)]">
                <Link href={`/${vet.slug}`} className="underline">
                  /{vet.slug}
                </Link>
                {" · "}
                {vet.username}
                {vet.phone ? ` · ${vet.phone}` : ""}
                {" · "}
                {vet.isActive ? t(uiLocale, "active") : t(uiLocale, "inactive")}
                {" · "}
                {vet.whatsappEnabled
                  ? t(uiLocale, "waEnabled")
                  : t(uiLocale, "waDisabledAdmin")}
                {" · "}
                {t(uiLocale, "waUsageLine", {
                  used: vet.whatsappUsed,
                  limit: vet.whatsappMonthlyLimit,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                className="shop-chip rounded-xl px-3 py-1.5 text-sm"
                onClick={() =>
                  patchVet(
                    vet.id,
                    { isActive: !vet.isActive },
                    vet.isActive
                      ? t(uiLocale, "vetDisabled")
                      : t(uiLocale, "vetEnabled"),
                  )
                }
              >
                {vet.isActive ? t(uiLocale, "toggleOff") : t(uiLocale, "toggleOn")}
              </button>
              <button
                type="button"
                className="shop-chip rounded-xl px-3 py-1.5 text-sm"
                onClick={() =>
                  patchVet(
                    vet.id,
                    { whatsappEnabled: !vet.whatsappEnabled },
                    vet.whatsappEnabled
                      ? t(uiLocale, "waFeatureOff")
                      : t(uiLocale, "waFeatureOn"),
                  )
                }
              >
                {vet.whatsappEnabled
                  ? t(uiLocale, "waToggleOff")
                  : t(uiLocale, "waToggleOn")}
              </button>
              <label className="text-xs">
                {t(uiLocale, "waLimitLabel")}
                <input
                  className="shop-field mt-1 w-24 rounded-xl px-2 py-1.5 text-sm"
                  inputMode="numeric"
                  value={waLimits[vet.id] ?? ""}
                  onChange={(e) =>
                    setWaLimits((prev) => ({ ...prev, [vet.id]: e.target.value }))
                  }
                />
              </label>
              <button
                type="button"
                className="shop-chip rounded-xl px-3 py-1.5 text-sm"
                onClick={() => {
                  const n = Number.parseInt(waLimits[vet.id] || "0", 10);
                  if (!Number.isFinite(n) || n < 0) {
                    setError(t(uiLocale, "invalidData"));
                    return;
                  }
                  patchVet(
                    vet.id,
                    { whatsappMonthlyLimit: n },
                    t(uiLocale, "waLimitUpdated"),
                  );
                }}
              >
                {t(uiLocale, "waLimitSave")}
              </button>
              <button
                type="button"
                className="shop-chip rounded-xl px-3 py-1.5 text-sm"
                onClick={() => resetPassword(vet)}
              >
                {t(uiLocale, "resetPassword")}
              </button>
              <button
                type="button"
                className="shop-chip rounded-xl px-3 py-1.5 text-sm text-red-200"
                onClick={() => deleteVet(vet)}
              >
                {t(uiLocale, "deleteVet")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
