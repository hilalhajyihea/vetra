"use client";

import Link from "next/link";
import { BrandMark, CheckIcon, WhatsAppIcon } from "@/components/BrandGraphics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUiLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import {
  SITE_ADMIN_EMAIL,
  SITE_ADMIN_PHONE,
  SITE_ADMIN_WHATSAPP,
} from "@/lib/site";

const sharedFeatureKeys = [
  "planFeature2",
  "planFeature3",
  "planFeature4",
  "planFeature5",
  "planFeature6",
] as const;

const plans = [
  {
    name: "plan5Name",
    limit: "plan5Limit",
    wa: "planWa5",
    featured: false,
  },
  {
    name: "plan20Name",
    limit: "plan20Limit",
    wa: "planWa20",
    featured: true,
  },
  {
    name: "planUnlimitedName",
    limit: "planUnlimitedLimit",
    wa: "planWaUnlimited",
    featured: false,
  },
] as const;

export function HomePage() {
  const locale = useUiLocale("he");

  return (
    <main lang={locale} dir="rtl" className="shop-shell relative flex flex-1 flex-col">
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto flex min-h-[88svh] w-full max-w-6xl flex-col px-6 py-6 sm:min-h-[92svh] sm:px-10 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandMark tone="light" />
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <LanguageToggle />
              <a
                href="#pricing"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                {t(locale, "navPricing")}
              </a>
              <a
                href="#contact"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                {t(locale, "navContact")}
              </a>
              <Link
                href="/platform/login"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                {t(locale, "admin")}
              </Link>
            </nav>
          </div>

          <header className="animate-fade-up my-auto max-w-2xl pb-16 pt-20">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--hay)] sm:text-sm">
              {t(locale, "heroEyebrow")}
            </p>
            <h1 className="font-display mt-4 text-4xl leading-[1.12] text-[var(--cream)] sm:text-6xl">
              {t(locale, "heroTitle")}
            </h1>
            <div className="vetra-rule mt-5" />
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[rgba(244,239,230,0.88)] sm:text-xl">
              {t(locale, "heroLead")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#pricing"
                className="btn-primary inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold"
              >
                {t(locale, "heroCtaPricing")}
              </a>
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/30 px-7 py-3.5 text-base font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/45"
              >
                <WhatsAppIcon className="h-5 w-5" />
                {t(locale, "heroCtaWhatsapp")}
              </a>
            </div>
          </header>
        </div>
      </section>

      <section className="relative px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-[var(--cream)] sm:text-4xl">
            {t(locale, "audiencesTitle")}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="surface-dark rounded-2xl p-6">
              <p className="text-sm font-semibold text-[var(--hay)]">
                {t(locale, "vetCardTitle")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(244,239,230,0.78)] sm:text-base">
                {t(locale, "vetCardText")}
              </p>
            </article>
            <article className="surface-dark rounded-2xl p-6">
              <p className="text-sm font-semibold text-[var(--hay)]">
                {t(locale, "breederCardTitle")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(244,239,230,0.78)] sm:text-base">
                {t(locale, "breederCardText")}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-[var(--cream)]">
            {t(locale, "howTitle")}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["how1Title", "how1Text"],
              ["how2Title", "how2Text"],
              ["how3Title", "how3Text"],
            ].map(([titleKey, textKey], index) => (
              <li key={titleKey} className="surface-dark rounded-2xl p-6">
                <p className="text-xs font-bold tracking-widest text-[var(--hay)]">
                  0{index + 1}
                </p>
                <p className="mt-2 font-semibold text-[var(--cream)]">
                  {t(locale, titleKey as "how1Title")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[rgba(244,239,230,0.72)]">
                  {t(locale, textKey as "how1Text")}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="pricing"
        className="relative scroll-mt-8 px-6 py-16 sm:px-10 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--hay)]">
            {t(locale, "navPricing")}
          </p>
          <h2 className="font-display mt-3 text-4xl text-[var(--cream)] sm:text-5xl">
            {t(locale, "pricingTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[rgba(244,239,230,0.68)]">
            {t(locale, "pricingLead")}
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const waHref = `${SITE_ADMIN_WHATSAPP}?text=${encodeURIComponent(t(locale, plan.wa))}`;
              return (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
                    plan.featured
                      ? "border-2 border-[var(--hay)] bg-[rgba(16,36,31,0.72)] shadow-[0_22px_60px_rgba(196,163,90,0.16)]"
                      : "surface-dark"
                  }`}
                >
                  <p className="font-display text-2xl text-[var(--cream)]">
                    {t(locale, plan.name)}
                  </p>
                  <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--cream)]">
                    <li className="flex items-start gap-2.5 font-medium">
                      <CheckIcon />
                      <span>{t(locale, plan.limit)}</span>
                    </li>
                    {sharedFeatureKeys.map((key) => (
                      <li key={key} className="flex items-start gap-2.5">
                        <CheckIcon />
                        <span>{t(locale, key)}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                  >
                    {t(locale, "planCta")}
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative scroll-mt-8 border-t border-white/10 px-6 py-14 sm:px-10"
      >
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-[var(--cream)] sm:text-4xl">
              {t(locale, "contactTitle")}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[rgba(244,239,230,0.7)]">
              {t(locale, "contactLead")}
            </p>
            <a
              href={`mailto:${SITE_ADMIN_EMAIL}`}
              className="mt-3 inline-block text-sm font-semibold text-[var(--hay)] underline-offset-2 hover:underline"
            >
              {SITE_ADMIN_EMAIL}
            </a>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 w-12 overflow-hidden rounded-xl shadow-md transition hover:scale-105"
                aria-label={`WhatsApp ${SITE_ADMIN_PHONE}`}
              >
                <WhatsAppIcon className="h-12 w-12" />
              </a>
              <div className="text-sm leading-tight">
                <a
                  href={SITE_ADMIN_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-semibold text-[var(--cream)] underline-offset-2 hover:underline"
                >
                  {SITE_ADMIN_PHONE}
                </a>
              </div>
            </div>
          </div>
        </div>
        <p className="relative mx-auto mt-10 max-w-6xl text-center text-sm text-[rgba(244,239,230,0.45)] sm:text-start">
          {t(locale, "footerLine")}
        </p>
      </section>
    </main>
  );
}
