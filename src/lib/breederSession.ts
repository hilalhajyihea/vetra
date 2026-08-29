import { requireBreederSession, requireVetSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireApprovedBreeder(slug?: string) {
  const session = await requireBreederSession(slug);
  if (!session) return null;
  const breeder = await prisma.breeder.findUnique({
    where: { id: session.breederId },
  });
  if (!breeder || breeder.status !== "APPROVED") return null;
  return { session, breeder };
}

export async function requireFarmAccess(farmId?: string | null) {
  if (farmId) {
    const vet = await requireVetSession();
    if (!vet) return null;
    const breeder = await prisma.breeder.findFirst({
      where: {
        id: farmId,
        veterinarianId: vet.vetId,
        status: "APPROVED",
      },
    });
    if (!breeder) return null;
    return { breeder, actor: "vet" as const };
  }

  const own = await requireApprovedBreeder();
  if (!own) return null;
  return { breeder: own.breeder, actor: "breeder" as const };
}

export function farmIdFromRequest(request: Request, body?: { farmId?: string }) {
  const url = new URL(request.url);
  return url.searchParams.get("farmId") || body?.farmId || undefined;
}
