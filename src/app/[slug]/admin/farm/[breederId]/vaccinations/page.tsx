import { ComingSoonSection } from "@/components/ComingSoonSection";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  return (
    <ComingSoonSection
      locale={normalizeLocale(vet?.locale)}
      titleKey="navVaccinations"
    />
  );
}
