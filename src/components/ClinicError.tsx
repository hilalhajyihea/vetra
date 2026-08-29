"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinicHomeFromPathname } from "@/lib/clinicPath";
import { t } from "@/lib/i18n";

export function ClinicError({ reset }: { reset?: () => void }) {
  const pathname = usePathname();
  const home = clinicHomeFromPathname(pathname);
  const toClinic = home !== "/";

  return (
    <main
      dir="rtl"
      className="shop-shell flex flex-1 flex-col items-center justify-center px-4 py-16 text-center"
    >
      <h1 className="font-display text-4xl text-[var(--cream)]">
        {t("he", "errorTitle")}
      </h1>
      <p className="mt-3 text-[rgba(244,239,230,0.62)]">
        {t("he", "errorLead")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {reset ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold"
          >
            {t("he", "tryAgain")}
          </button>
        ) : null}
        <Link
          href={home}
          className="btn-primary rounded-xl px-6 py-3 font-semibold"
        >
          {toClinic ? t("he", "backToVetHome") : t("he", "backHome")}
        </Link>
      </div>
    </main>
  );
}
