"use client";

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
};

export function BreederShell({
  slug,
  locale,
  firstName,
  lastName,
  farmName,
  clinicLabel,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${slug}/breeder`;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
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
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm"
        >
          {t(locale, "logout")}
        </button>
      </div>

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

      <div className="mt-8">{children}</div>
    </div>
  );
}
