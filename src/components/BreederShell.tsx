"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { t, type Locale, type MsgKey } from "@/lib/i18n";

const NAV: { segment: string; key: MsgKey }[] = [
  { segment: "vaccinations", key: "navVaccinations" },
  { segment: "pregnancy", key: "navPregnancy" },
  { segment: "calendar", key: "navCalendar" },
  { segment: "herd", key: "navHerd" },
  { segment: "book", key: "navBook" },
];

type Props = {
  slug: string;
  locale: Locale;
  firstName: string;
  lastName: string;
  farmName: string;
  clinicLabel: string;
  children: React.ReactNode;
  basePath?: string;
  viewer?: "breeder" | "vet";
  breederId?: string;
};

export function BreederShell({
  slug,
  locale,
  firstName,
  lastName,
  farmName,
  clinicLabel,
  children,
  basePath,
  viewer = "breeder",
  breederId,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = basePath || `/${slug}/breeder`;
  const fullName = `${firstName} ${lastName}`.trim();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const nameMatches =
    typedName.replace(/\s+/g, " ").trim() === fullName.replace(/\s+/g, " ").trim();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
  }

  async function deleteBreeder() {
    if (!breederId) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/vet/breeders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: breederId, confirmName: typedName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(
          data.error === "NAME_MISMATCH"
            ? t(locale, "deleteBreederMismatch")
            : t(locale, "deleteBreederFailed"),
        );
        return;
      }
      router.push(`/${slug}/admin`);
    } catch {
      setDeleteError(t(locale, "deleteBreederFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" lang={locale} dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <BrandMark tone="light" />
          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[var(--hay)]">
            {clinicLabel}
          </p>
          <p className="mt-1 text-sm text-[var(--cream)]">
            {firstName} {lastName}
            <span className="mr-2 text-[rgba(244,239,230,0.55)]">· {farmName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewer === "vet" ? (
            <Link
              href={`/${slug}/admin`}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm"
            >
              {t(locale, "backToBreeders")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm"
            >
              {t(locale, "logout")}
            </button>
          )}
        </div>
      </div>

      {viewer === "vet" ? (
        <p className="mb-4 rounded-xl border border-[var(--hay)]/40 bg-[var(--hay)]/10 px-4 py-2 text-sm text-[var(--hay)]">
          {t(locale, "viewingAsVet")}
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        {NAV.map((item) => {
          const href = `${base}/${item.segment}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.segment}
              href={href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--teal)] text-[var(--cream)]"
                  : "border border-white/20 text-[rgba(244,239,230,0.78)] hover:bg-white/10"
              }`}
            >
              {t(locale, item.key)}
            </Link>
          );
        })}
      </nav>

      {viewer === "vet" && breederId ? (
        <div className="mt-3">
          <button
            type="button"
            className="rounded-xl border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/40"
            onClick={() => {
              setTypedName("");
              setDeleteError("");
              setConfirmOpen(true);
            }}
          >
            {t(locale, "deleteBreeder")}
          </button>
        </div>
      ) : null}

      <div className="mt-8">{children}</div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="surface-dark w-full max-w-md rounded-2xl p-5">
            <h2 className="font-display text-xl text-[var(--cream)]">
              {t(locale, "deleteBreeder")}
            </h2>
            <p className="mt-2 text-sm text-[rgba(244,239,230,0.72)]">
              {t(locale, "deleteBreederLead")}
            </p>
            <label className="mt-4 block text-sm font-semibold">
              {t(locale, "deleteBreederNameLabel")}
            </label>
            <p className="mt-1 text-xs text-[var(--hay)]">
              {t(locale, "deleteBreederNameHint", { name: fullName })}
            </p>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoComplete="off"
            />
            {deleteError ? (
              <p className="mt-2 text-sm text-red-200">{deleteError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={deleting || !nameMatches}
                onClick={deleteBreeder}
              >
                {t(locale, "deleteBreederConfirm")}
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
              >
                {t(locale, "deleteBreederCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
