import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return {
    title: vet
      ? `${t(locale, "brand")} · ${t(locale, "loginTitle")} · ${vet.displayName}`
      : `${t(locale, "brand")} · ${t(locale, "loginTitle")}`,
  };
}

export default async function VetLoginPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const session = await getSession();
  if (session?.kind === "vet" && session.slug === slug) {
    redirect(`/${slug}/admin`);
  }

  const locale = normalizeLocale(vet.locale);

  return (
    <main
      className="shop-shell flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12"
      lang={locale}
    >
      <LoginForm
        endpoint="/api/auth/vet/login"
        titleKey="loginTitle"
        subtitleKey="loginSubtitle"
        subtitleVars={{ name: vet.displayName }}
        redirectTo={`/${slug}/admin`}
        locale={locale}
        backHref={`/${slug}`}
        backKey="backToVetHome"
      />
    </main>
  );
}
