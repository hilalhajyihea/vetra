import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VetComingSoon } from "@/components/VetComingSoon";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { vetShareMetadata } from "@/lib/seo";
import { RESERVED_SLUGS } from "@/lib/vets";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) {
    return { title: "Vetra" };
  }
  return vetShareMetadata(vet.displayName, vet.slug);
}

export default async function VetPublicPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const vet = await prisma.veterinarian.findUnique({
    where: { slug },
    select: {
      slug: true,
      displayName: true,
      clinicName: true,
      isActive: true,
      locale: true,
    },
  });
  if (!vet || !vet.isActive) notFound();

  return (
    <VetComingSoon
      slug={vet.slug}
      displayName={vet.displayName}
      clinicName={vet.clinicName}
      locale={normalizeLocale(vet.locale)}
    />
  );
}
