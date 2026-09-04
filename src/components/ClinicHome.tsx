"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  slug: string;
  displayName: string;
  clinicName: string | null;
  locale: Locale;
};

export function ClinicHome({ slug, displayName, clinicName, locale: localeProp }: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/breeder/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "loginFailed"));
        return;
      }
      router.push(data.redirectTo || `/${slug}/breeder`);
      router.refresh();
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      lang={locale}
      dir="rtl"
      className="shop-shell flex flex-1 flex-col items-center justify-center px-4 py-12"
    >
      <div className="mb-4 flex w-full max-w-md justify-end">
        <LanguageToggle fallback={localeProp} />
      </div>
      <form
        onSubmit={onSubmit}
        className="surface-dark w-full max-w-md rounded-2xl p-6 sm:p-8"
      >
        <BrandMark tone="light" className="mb-6" />
        <p className="text-xs font-semibold tracking-[0.24em] text-[var(--hay)]">
          {t(locale, "clinicWelcome")}
        </p>
        <h1 className="font-display mt-3 text-3xl text-[var(--cream)]">
          {clinicName || displayName}
        </h1>
        {clinicName ? (
          <p className="mt-1 text-sm text-[rgba(244,239,230,0.62)]">
            {displayName}
          </p>
        ) : null}

        <label className="mt-8 block text-sm font-medium text-[var(--cream)]">
          {t(locale, "breederPhone")}
          <input
            className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[var(--cream)]">
          {t(locale, "password")}
          <input
            type="password"
            className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-6 w-full rounded-xl py-3 font-semibold"
        >
          {loading ? t(locale, "loggingIn") : t(locale, "breederLoginCta")}
        </button>

        <p className="mt-6 text-center text-sm text-[rgba(244,239,230,0.72)]">
          {t(locale, "needAccount")}{" "}
          <Link
            href={`/${slug}/register`}
            className="font-semibold text-[var(--hay)] underline-offset-2 hover:underline"
          >
            {t(locale, "registerCta")}
          </Link>
        </p>
      </form>

      <Link
        href={`/${slug}/login`}
        className="mt-6 text-sm text-[rgba(244,239,230,0.5)] underline-offset-2 hover:underline"
      >
        {t(locale, "vetStaffLogin")}
      </Link>
    </main>
  );
}
