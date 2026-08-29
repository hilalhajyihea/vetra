import { NextResponse } from "next/server";
import { farmIdFromRequest, requireFarmAccess } from "@/lib/breederSession";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireFarmAccess(farmIdFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const vaccines = await prisma.vaccineType.findMany({
    where: { veterinarianId: auth.breeder.veterinarianId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ vaccines });
}
