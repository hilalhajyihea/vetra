import { requireBreederSession } from "@/lib/auth";
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
