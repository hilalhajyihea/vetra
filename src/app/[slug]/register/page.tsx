import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreederRegisterForm } from "@/components/BreederRegisterForm";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return {
    title: `${t(locale, "brand")} · ${t(locale, "registerTitle")}`,
  };
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const locale = normalizeLocale(vet.locale);

  return (
    <BreederRegisterForm
      slug={vet.slug}
      clinicLabel={vet.clinicName || vet.displayName}
      locale={locale}
    />
  );
}
