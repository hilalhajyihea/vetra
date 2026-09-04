"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, normalizeLocale, type Locale, type MsgKey } from "@/lib/i18n";

type Props = {
  endpoint: string;
  titleKey: MsgKey;
  subtitleKey?: MsgKey;
  subtitleVars?: Record<string, string | number>;
  redirectTo: string;
  locale?: Locale | string;
  backHref?: string;
  backKey?: MsgKey;
};

export function LoginForm({
  endpoint,
  titleKey,
  subtitleKey,
  subtitleVars,
  redirectTo,
  locale: localeProp,
  backHref,
  backKey,
}: Props) {
  const locale = useUiLocale(normalizeLocale(localeProp));
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "loginFailed"));
        return;
      }
      const dest =
        data.vet?.slug != null ? `/${data.vet.slug}/admin` : redirectTo;
      router.push(dest);
      router.refresh();
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex w-full max-w-md justify-end">
        <LanguageToggle fallback={normalizeLocale(localeProp)} />
      </div>
      <form
        onSubmit={onSubmit}
        lang={locale}
        dir="rtl"
        className="surface-dark relative w-full max-w-md overflow-hidden rounded-2xl p-6 sm:p-8"
      >
        <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-[var(--hay)] to-[var(--teal)] opacity-80" />
        <BrandMark className="mb-6" tone="light" label={t(locale, "brand")} />
        <h1 className="font-display text-3xl text-[var(--cream)]">
          {t(locale, titleKey)}
        </h1>
        {subtitleKey ? (
          <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, subtitleKey, subtitleVars)}
          </p>
        ) : null}

        <label className="mt-6 block text-sm font-medium text-[var(--cream)]">
          {t(locale, "username")}
          <input
            className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
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
          {loading ? t(locale, "loggingIn") : t(locale, "loginCta")}
        </button>
      </form>
      {backHref && backKey ? (
        <Link
          href={backHref}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm text-[var(--cream)] transition hover:bg-white/10"
        >
          {t(locale, backKey)}
        </Link>
      ) : null}
    </>
  );
}
