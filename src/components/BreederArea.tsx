"use client";

import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandGraphics";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  slug: string;
  firstName: string;
  lastName: string;
  farmName: string;
  clinicLabel: string;
  locale: Locale;
};

export function BreederArea({
  slug,
  firstName,
  lastName,
  farmName,
  clinicLabel,
  locale,
}: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" lang={locale} dir="rtl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <BrandMark tone="light" />
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm"
        >
          {t(locale, "logout")}
        </button>
      </div>

      <p className="text-xs font-semibold tracking-[0.24em] text-[var(--hay)]">
        {clinicLabel}
      </p>
      <h1 className="font-display mt-3 text-3xl text-[var(--cream)]">
        {t(locale, "breederAreaTitle")}
      </h1>
      <p className="mt-2 text-lg text-[var(--cream)]">
        {firstName} {lastName}
      </p>
      <p className="text-sm text-[rgba(244,239,230,0.62)]">{farmName}</p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
        {t(locale, "breederAreaLead")}
      </p>
    </div>
  );
}
