import type { Metadata } from "next";
import { TreatmentsBoard } from "@/components/TreatmentsBoard";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return { title: `${t(locale, "brand")} · ${t(locale, "treatmentsTitle")}` };
}

export default async function TreatmentsPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return <TreatmentsBoard slug={slug} locale={locale} />;
}
