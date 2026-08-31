"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { VaccineCatalogEditor } from "@/components/VaccineCatalogEditor";
import { VetBookingPanel } from "@/components/VetBookingPanel";
import { t, type Locale } from "@/lib/i18n";

type BreederRow = {
  id: string;
  firstName: string;
  lastName: string;
  farmName: string;
  phone: string;
  email: string;
  status: string;
};

type Props = {
  slug: string;
  displayName: string;
  clinicName: string | null;
  locale: Locale;
};

export function VetAdminPanel({
  slug,
  displayName,
  clinicName,
  locale,
}: Props) {
  const router = useRouter();
  const [breeders, setBreeders] = useState<BreederRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vet/breeders");
      if (res.status === 401) {
        router.push(`/${slug}/login`);
        return;
      }
      const data = await res.json();
      setBreeders(data.breeders || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale, router, slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}/login`);
  }

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    setError("");
    const res = await fetch("/api/vet/breeders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    setMessage(
      status === "APPROVED" ? t(locale, "approved") : t(locale, "rejected"),
    );
    load();
  }

  const pending = breeders.filter((b) => b.status === "PENDING");
  const approved = breeders.filter((b) => b.status === "APPROVED");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" lang={locale} dir="rtl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <BrandMark tone="light" />
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${slug}`}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            {t(locale, "vetAdminPublic")}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            {t(locale, "logout")}
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold tracking-[0.24em] text-[var(--hay)]">
        {t(locale, "vetAdminEyebrow")}
      </p>
      <h1 className="font-display mt-3 text-3xl text-[var(--cream)]">
        {t(locale, "vetAdminTitle", { name: displayName })}
      </h1>
      {clinicName ? (
        <p className="mt-1 text-sm text-[rgba(244,239,230,0.62)]">{clinicName}</p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--hay)]">{message}</p>
      ) : null}

      <VaccineCatalogEditor locale={locale} />

      <VetBookingPanel locale={locale} />

      <section className="mt-10">
        <h2 className="font-display text-2xl text-[var(--cream)]">
          {t(locale, "pendingTitle")}
        </h2>
        {loading ? (
          <p className="mt-3 text-sm">{t(locale, "loading")}</p>
        ) : pending.length === 0 ? (
          <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "noPending")}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((b) => (
              <li key={b.id} className="surface-dark rounded-2xl p-4">
                <p className="font-semibold">
                  {b.firstName} {b.lastName}
                </p>
                <p className="text-sm text-[rgba(244,239,230,0.62)]">
                  {b.farmName} · {b.phone} · {b.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                    onClick={() => setStatus(b.id, "APPROVED")}
                  >
                    {t(locale, "approve")}
                  </button>
                  <button
                    type="button"
                    className="shop-chip rounded-xl px-4 py-2 text-sm"
                    onClick={() => setStatus(b.id, "REJECTED")}
                  >
                    {t(locale, "reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-[var(--cream)]">
          {t(locale, "approvedTitle")}
        </h2>
        {approved.length === 0 ? (
          <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "noApproved")}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {approved.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/${slug}/admin/farm/${b.id}/herd`}
                  className="surface-dark block rounded-2xl p-4 transition hover:border-[var(--hay)] hover:bg-white/5"
                >
                  <p className="font-semibold">
                    {b.firstName} {b.lastName}
                  </p>
                  <p className="text-sm text-[rgba(244,239,230,0.62)]">
                    {b.farmName} · {b.phone} · {b.email}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--hay)]">
                    {t(locale, "openFarm")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
