import { notFound, redirect } from "next/navigation";
import { BreederShell } from "@/components/BreederShell";
import { requireVetSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string; breederId: string }>;
};

export default async function VetFarmLayout({ children, params }: Props) {
  const { slug, breederId } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const session = await requireVetSession(slug);
  if (!session) redirect(`/${slug}/login`);

  const breeder = await prisma.breeder.findFirst({
    where: {
      id: breederId,
      veterinarianId: vet.id,
      status: "APPROVED",
    },
    select: {
      firstName: true,
      lastName: true,
      farmName: true,
    },
  });
  if (!breeder) notFound();

  const locale = normalizeLocale(vet.locale);

  return (
    <main className="shop-shell flex-1" lang={locale}>
      <BreederShell
        slug={vet.slug}
        locale={locale}
        firstName={breeder.firstName}
        lastName={breeder.lastName}
        farmName={breeder.farmName}
        clinicLabel={vet.clinicName || vet.displayName}
        basePath={`/${vet.slug}/admin/farm/${breederId}`}
        viewer="vet"
        breederId={breederId}
      >
        {children}
      </BreederShell>
    </main>
  );
}
