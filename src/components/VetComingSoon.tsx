"use client";

import Link from "next/link";
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

export function VetComingSoon({
  slug,
  displayName,
  clinicName,
  locale: localeProp,
}: Props) {
  const locale = useUiLocale(localeProp);
  return (
    <main
      lang={locale}
      dir="rtl"
      className="shop-shell flex flex-1 flex-col items-center justify-center px-6 py-16"
    >
      <div className="mb-4">
        <LanguageToggle fallback={localeProp} />
      </div>
      <div className="surface-dark w-full max-w-lg rounded-2xl p-8 text-center">
        <BrandMark tone="light" className="justify-center" />
        <p className="mt-6 text-xs font-semibold tracking-[0.24em] text-[var(--hay)]">
          {t(locale, "comingEyebrow")}
        </p>
        <h1 className="font-display mt-3 text-3xl text-[var(--cream)]">
          {clinicName || displayName}
        </h1>
        {clinicName ? (
          <p className="mt-1 text-sm text-[rgba(244,239,230,0.62)]">
            {displayName}
          </p>
        ) : null}
        <div className="vetra-rule mx-auto mt-5" />
        <h2 className="mt-6 text-xl font-semibold text-[var(--cream)]">
          {t(locale, "comingTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
          {t(locale, "comingLead")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${slug}/login`}
            className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold"
          >
            {t(locale, "comingLogin")}
          </Link>
          <Link
            href={`/${slug}`}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold"
          >
            {t(locale, "backToVetHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
