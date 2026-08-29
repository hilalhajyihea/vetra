import { compare, hash } from "bcryptjs";
import { isValidMobile, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function registerBreeder(input: {
  slug: string;
  firstName: string;
  lastName: string;
  farmName: string;
  phone: string;
  email: string;
  password: string;
}) {
  const vet = await prisma.veterinarian.findUnique({
    where: { slug: input.slug },
  });
  if (!vet || !vet.isActive) {
    throw new Error("CLINIC_NOT_FOUND");
  }

  const phone = normalizePhone(input.phone);
  if (!isValidMobile(phone)) {
    throw new Error("PHONE_INVALID");
  }

  const existing = await prisma.breeder.findUnique({
    where: {
      veterinarianId_phone: {
        veterinarianId: vet.id,
        phone,
      },
    },
  });
  if (existing) {
    throw new Error("PHONE_TAKEN");
  }

  const passwordHash = await hash(input.password, 12);

  return prisma.breeder.create({
    data: {
      veterinarianId: vet.id,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      farmName: input.farmName.trim(),
      phone,
      email: input.email.trim().toLowerCase(),
      passwordHash,
      status: "PENDING",
    },
  });
}

export async function authenticateBreeder(
  slug: string,
  phoneRaw: string,
  password: string,
) {
  const phone = normalizePhone(phoneRaw);
  const vet = await prisma.veterinarian.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!vet || !vet.isActive) return { error: "CLINIC_NOT_FOUND" as const };

  const breeder = await prisma.breeder.findUnique({
    where: {
      veterinarianId_phone: {
        veterinarianId: vet.id,
        phone,
      },
    },
  });
  if (!breeder) return { error: "BAD_CREDENTIALS" as const };

  const ok = await compare(password, breeder.passwordHash);
  if (!ok) return { error: "BAD_CREDENTIALS" as const };

  if (breeder.status === "PENDING") return { error: "PENDING" as const, breeder };
  if (breeder.status === "REJECTED") return { error: "REJECTED" as const };

  return { breeder };
}
