import { inboundPhoneKey, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export function windowOpen(lastInboundAt: Date | null | undefined) {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < WINDOW_MS;
}

function previewOf(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 160);
}

async function findBreedersForPhone(from: string) {
  const key = inboundPhoneKey(from);
  const digits = from.replace(/\D/g, "");
  const candidates = Array.from(
    new Set([key, normalizePhone(from), digits, digits.startsWith("972") ? `0${digits.slice(3)}` : ""]),
  ).filter(Boolean);

  return prisma.breeder.findMany({
    where: { phone: { in: candidates } },
    select: {
      id: true,
      veterinarianId: true,
      firstName: true,
      lastName: true,
      farmName: true,
      veterinarian: { select: { whatsappEnabled: true } },
    },
  });
}

export async function recordThreadMessage(input: {
  veterinarianId: string;
  breederId?: string | null;
  phone: string;
  contactName?: string;
  direction: "IN" | "OUT";
  body: string;
  metaId?: string | null;
  at?: Date;
}) {
  const phone = inboundPhoneKey(input.phone);
  const at = input.at || new Date();
  const body = input.body.slice(0, 4000);
  const preview = previewOf(body);

  if (input.metaId) {
    const exists = await prisma.whatsAppMessage.findFirst({
      where: {
        metaId: input.metaId,
        thread: { veterinarianId: input.veterinarianId },
      },
      select: { id: true },
    });
    if (exists) return;
  }

  const thread = await prisma.whatsAppThread.upsert({
    where: {
      veterinarianId_phone: {
        veterinarianId: input.veterinarianId,
        phone,
      },
    },
    create: {
      veterinarianId: input.veterinarianId,
      breederId: input.breederId || null,
      phone,
      contactName: input.contactName || "",
      lastMessageAt: at,
      lastInboundAt: input.direction === "IN" ? at : null,
      lastPreview: preview,
      unreadCount: input.direction === "IN" ? 1 : 0,
    },
    update: {
      lastMessageAt: at,
      lastPreview: preview,
      ...(input.breederId ? { breederId: input.breederId } : {}),
      ...(input.contactName ? { contactName: input.contactName } : {}),
      ...(input.direction === "IN"
        ? { lastInboundAt: at, unreadCount: { increment: 1 } }
        : {}),
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      threadId: thread.id,
      direction: input.direction,
      body,
      metaId: input.metaId || null,
      createdAt: at,
    },
  });
}

export async function storeInboundWhatsApp(input: {
  from: string;
  body: string;
  metaId?: string;
  contactName?: string;
  at?: Date;
}) {
  const breeders = (await findBreedersForPhone(input.from)).filter(
    (b) => b.veterinarian.whatsappEnabled,
  );
  const targets = new Map<
    string,
    { breederId: string | null; contactName: string }
  >();

  for (const breeder of breeders) {
    targets.set(breeder.veterinarianId, {
      breederId: breeder.id,
      contactName: `${breeder.firstName} ${breeder.lastName}`.trim(),
    });
  }

  if (targets.size === 0) {
    const enabled = await prisma.veterinarian.findMany({
      where: { whatsappEnabled: true, isActive: true },
      select: { id: true },
    });
    if (enabled.length === 1) {
      targets.set(enabled[0].id, {
        breederId: null,
        contactName: input.contactName || "",
      });
    }
  }

  for (const [veterinarianId, target] of targets) {
    await recordThreadMessage({
      veterinarianId,
      breederId: target.breederId,
      phone: input.from,
      contactName: target.contactName || input.contactName,
      direction: "IN",
      body: input.body,
      metaId: input.metaId,
      at: input.at,
    });
  }
}
