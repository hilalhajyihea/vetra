"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  slug: string;
  clinicLabel: string;
  locale: Locale;
};

export function BreederRegisterForm({ slug, clinicLabel, locale: localeProp }: Props) {
  const locale = useUiLocale(localeProp);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/breeder/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          firstName,
          lastName,
          farmName,
          phone,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "errInvalidData"));
        return;
      }
      setDone(true);
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
      <div className="surface-dark w-full max-w-md rounded-2xl p-6 sm:p-8">
        <BrandMark tone="light" className="mb-6" />
        <h1 className="font-display text-3xl text-[var(--cream)]">
          {t(locale, "registerTitle")}
        </h1>
        <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
          {clinicLabel}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
          {t(locale, "registerLead")}
        </p>

        {done ? (
          <div className="mt-8">
            <p className="rounded-lg border border-[rgba(196,163,90,0.35)] bg-black/25 px-4 py-3 text-sm text-[var(--cream)]">
              {t(locale, "registerSuccess")}
            </p>
            <Link
              href={`/${slug}`}
              className="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 font-semibold"
            >
              {t(locale, "backToClinic")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            <label className="text-sm font-medium text-[var(--cream)]">
              {t(locale, "firstName")}
              <input
                className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="text-sm font-medium text-[var(--cream)]">
              {t(locale, "lastName")}
              <input
                className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="text-sm font-medium text-[var(--cream)]">
              {t(locale, "farmName")}
              <input
                className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="text-sm font-medium text-[var(--cream)]">
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
            <label className="text-sm font-medium text-[var(--cream)]">
              {t(locale, "email")}
              <input
                type="email"
                className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="text-sm font-medium text-[var(--cream)]">
              {t(locale, "password")}
              <input
                type="password"
                className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 rounded-xl py-3 font-semibold"
            >
              {loading ? t(locale, "registerSaving") : t(locale, "registerSubmit")}
            </button>
            <Link
              href={`/${slug}`}
              className="text-center text-sm text-[rgba(244,239,230,0.62)] underline-offset-2 hover:underline"
            >
              {t(locale, "backToClinic")}
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
