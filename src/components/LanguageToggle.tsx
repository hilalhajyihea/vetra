"use client";

import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
};

export function LanguageToggle({ locale, onChange, className = "" }: Props) {
  function setLocale(next: Locale) {
    onChange(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

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
