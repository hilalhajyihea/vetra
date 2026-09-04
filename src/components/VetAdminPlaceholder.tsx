"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, CheckIcon } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  slug: string;
  displayName: string;
  clinicName: string | null;
  locale: Locale;
};

const featureKeys = [
  "comingFeature1",
  "comingFeature2",
  "comingFeature3",
  "comingFeature4",
] as const;

export function VetAdminPlaceholder({
  slug,
  displayName,
  clinicName,
  locale: localeProp,
}: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}/login`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" lang={locale} dir="rtl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <BrandMark tone="light" />
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle fallback={localeProp} />
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
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
        {t(locale, "vetAdminLead")}
      </p>

      <ul className="surface-dark mt-8 space-y-3 rounded-2xl p-6">
        {featureKeys.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-sm">
            <CheckIcon />
            <span>{t(locale, key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
