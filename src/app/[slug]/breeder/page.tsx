import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BreederArea } from "@/components/BreederArea";
import { requireBreederSession } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  const locale = normalizeLocale(vet?.locale);
  return {
    title: `${t(locale, "brand")} · ${t(locale, "breederAreaTitle")}`,
  };
}

export default async function BreederPage({ params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const session = await requireBreederSession(slug);
  if (!session) redirect(`/${slug}`);

  const breeder = await prisma.breeder.findUnique({
    where: { id: session.breederId },
    select: { status: true, firstName: true, lastName: true, farmName: true },
  });
  if (!breeder || breeder.status !== "APPROVED") {
    redirect(`/${slug}`);
  }

  const locale = normalizeLocale(vet.locale);

  return (
    <main className="shop-shell flex-1" lang={locale}>
      <BreederArea
        slug={vet.slug}
        firstName={breeder.firstName}
        lastName={breeder.lastName}
        farmName={breeder.farmName}
        clinicLabel={vet.clinicName || vet.displayName}
        locale={locale}
      />
    </main>
  );
}
