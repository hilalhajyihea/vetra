import { prisma } from "@/lib/prisma";

export function israelMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
  })
    .format(new Date())
    .slice(0, 7);
}

export function monthUsage(vet: {
  whatsappMonthKey: string;
  whatsappMonthCount: number;
}) {
  return vet.whatsappMonthKey === israelMonthKey() ? vet.whatsappMonthCount : 0;
}

export async function whatsappQuotaFor(vetId: string) {
  const vet = await prisma.veterinarian.findUnique({
    where: { id: vetId },
    select: {
      whatsappEnabled: true,
      whatsappMonthlyLimit: true,
      whatsappMonthKey: true,
      whatsappMonthCount: true,
    },
  });
  if (!vet) return null;
  const month = israelMonthKey();
  const used = monthUsage(vet);
  if (vet.whatsappMonthKey !== month && vet.whatsappMonthCount !== 0) {
    await prisma.veterinarian.update({
      where: { id: vetId },
      data: { whatsappMonthKey: month, whatsappMonthCount: 0 },
    });
    return {
      enabled: vet.whatsappEnabled,
      limit: vet.whatsappMonthlyLimit,
      used: 0,
    };
  }
  return {
    enabled: vet.whatsappEnabled,
    limit: vet.whatsappMonthlyLimit,
    used,
  };
}

export async function recordSuccessfulWhatsAppSend(vetId: string) {
  const month = israelMonthKey();
  const vet = await prisma.veterinarian.findUnique({
    where: { id: vetId },
    select: {
      whatsappEnabled: true,
      whatsappMonthlyLimit: true,
      whatsappMonthKey: true,
      whatsappMonthCount: true,
    },
  });
  if (!vet?.whatsappEnabled) return { ok: false as const, error: "DISABLED" };
  const used = monthUsage(vet);
  if (used >= vet.whatsappMonthlyLimit) {
    return { ok: false as const, error: "QUOTA" };
  }
  await prisma.veterinarian.update({
    where: { id: vetId },
    data: {
      whatsappMonthKey: month,
      whatsappMonthCount: used + 1,
    },
  });
  return { ok: true as const };
}
