import type { Metadata } from "next";
import { VaccinationsBoard } from "@/components/VaccinationsBoard";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return { title: `${t(locale, "brand")} · ${t(locale, "vaccinesTitle")}` };
}

export default async function VaccinationsPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return <VaccinationsBoard slug={slug} locale={locale} />;
}
