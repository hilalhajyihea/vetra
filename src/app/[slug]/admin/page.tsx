import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VetAdminPlaceholder } from "@/components/VetAdminPlaceholder";
import { requireVetSession } from "@/lib/auth";
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
      ? `${t(locale, "brand")} · ${vet.displayName}`
      : t(locale, "brand"),
  };
}

export default async function VetAdminPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const session = await requireVetSession(slug);
  if (!session) redirect(`/${slug}/login`);

  const locale = normalizeLocale(vet.locale);

  return (
    <main className="shop-shell flex-1" lang={locale}>
      <VetAdminPlaceholder
        slug={vet.slug}
        displayName={vet.displayName}
        clinicName={vet.clinicName}
        locale={locale}
      />
    </main>
  );
}
