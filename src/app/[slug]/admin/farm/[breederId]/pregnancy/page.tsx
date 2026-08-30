import type { Metadata } from "next";
import { PregnancyBoard } from "@/components/PregnancyBoard";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; breederId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return { title: `${t(locale, "brand")} · ${t(locale, "pregnancyTitle")}` };
}

export default async function VetFarmPregnancyPage({ params }: Props) {
  const { slug, breederId } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return <PregnancyBoard slug={slug} locale={locale} farmId={breederId} />;
}
