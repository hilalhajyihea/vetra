"use client";

import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale, type MsgKey } from "@/lib/i18n";

export function ComingSoonSection({
  locale: localeProp,
  titleKey,
}: {
  locale: Locale;
  titleKey: MsgKey;
}) {
  const locale = useUiLocale(localeProp);
  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, titleKey)}
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
        {t(locale, "comingSoonPage")}
      </p>
    </div>
  );
}
