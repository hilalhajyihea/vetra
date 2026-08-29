import { notFound, redirect } from "next/navigation";
import { BreederShell } from "@/components/BreederShell";
import { requireBreederSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function BreederLayout({ children, params }: Props) {
  const { slug } = await params;
  const vet = await prisma.veterinarian.findUnique({ where: { slug } });
  if (!vet || !vet.isActive) notFound();

  const session = await requireBreederSession(slug);
  if (!session) redirect(`/${slug}`);

  const breeder = await prisma.breeder.findUnique({
    where: { id: session.breederId },
    select: {
      status: true,
      firstName: true,
      lastName: true,
      farmName: true,
    },
  });
  if (!breeder || breeder.status !== "APPROVED") {
    redirect(`/${slug}`);
  }

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
      >
        {children}
      </BreederShell>
    </main>
  );
}
