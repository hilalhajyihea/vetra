import { compare, hash } from "bcryptjs";
import { isValidMobile, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const RESERVED_SLUGS = new Set([
  "platform",
  "api",
  "admin",
  "login",
  "_next",
  "favicon.ico",
  "register",
  "breeder",
]);

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export async function authenticateVet(username: string, password: string) {
  const vet = await prisma.veterinarian.findUnique({ where: { username } });
  if (!vet || !vet.isActive) return null;
  const ok = await compare(password, vet.passwordHash);
  if (!ok) return null;
  return vet;
}

export async function createVet(input: {
  slug: string;
  displayName: string;
  username: string;
  password: string;
  clinicName?: string;
  locale?: string;
  phone?: string;
  plan?: string;
}) {
  if (!isValidSlug(input.slug)) {
    throw new Error("כתובת לא תקינה (רק אותיות באנגלית קטנות, מספרים ומקף)");
  }

  const passwordHash = await hash(input.password, 12);

  return prisma.veterinarian.create({
    data: {
      slug: input.slug,
      displayName: input.displayName.trim(),
      clinicName: input.clinicName?.trim() || null,
      username: input.username.trim(),
      passwordHash,
      locale: input.locale === "ar" ? "ar" : "he",
      phone: input.phone?.trim()
        ? isValidMobile(normalizePhone(input.phone))
          ? normalizePhone(input.phone)
          : input.phone.trim()
        : null,
      plan: input.plan === "CUSTOM" ? "CUSTOM" : "BASE",
    },
  });
}

export async function resetVetPassword(vetId: string, password: string) {
  const passwordHash = await hash(password, 12);
  return prisma.veterinarian.update({
    where: { id: vetId },
    data: { passwordHash },
  });
}
