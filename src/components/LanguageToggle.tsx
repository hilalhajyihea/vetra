"use client";

import { useLocaleControls } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

type Props = {
  fallback?: Locale;
  className?: string;
};

export function LanguageToggle({ fallback = "he", className = "" }: Props) {
  const { locale, setLocale } = useLocaleControls(fallback);

  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl border border-white/20 bg-black/25 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("he")}
        className={`px-3 py-2 transition ${
          locale === "he"
            ? "bg-[var(--teal)] text-[var(--cream)]"
            : "text-[rgba(244,239,230,0.72)] hover:bg-white/10"
        }`}
      >
        עברית
      </button>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={`px-3 py-2 transition ${
          locale === "ar"
            ? "bg-[var(--teal)] text-[var(--cream)]"
            : "text-[rgba(244,239,230,0.72)] hover:bg-white/10"
        }`}
      >
        العربية
      </button>
    </div>
  );
}
