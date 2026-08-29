"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinicHomeFromPathname } from "@/lib/clinicPath";
import { t } from "@/lib/i18n";

export function ClinicNotFound() {
  const pathname = usePathname();
  const home = clinicHomeFromPathname(pathname);
  const toClinic = home !== "/";

  return (
    <main
      dir="rtl"
      className="shop-shell flex flex-1 flex-col items-center justify-center px-4 py-16 text-center"
    >
      <h1 className="font-display text-4xl text-[var(--cream)]">
        {t("he", "notFoundTitle")} · {t("ar", "notFoundTitle")}
      </h1>
      <p className="mt-3 text-[rgba(244,239,230,0.62)]">
        {t("he", "notFoundLead")}
      </p>
      <Link
        href={home}
        className="btn-primary mt-8 rounded-xl px-6 py-3 font-semibold"
      >
        {toClinic ? t("he", "backToVetHome") : t("he", "backHome")}
      </Link>
    </main>
  );
}
