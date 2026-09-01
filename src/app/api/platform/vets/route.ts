import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVet, isValidSlug, resetVetPassword } from "@/lib/vets";
import { isValidMobile, normalizePhone } from "@/lib/phone";

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const vets = await prisma.veterinarian.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      clinicName: true,
      username: true,
      isActive: true,
      locale: true,
      phone: true,
      plan: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ vets });
}

const createSchema = z.object({
  slug: z.string().min(2).max(40),
  displayName: z.string().min(2).max(80),
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(100),
  clinicName: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  locale: z.enum(["he", "ar"]).optional(),
  plan: z.enum(["BASE", "CUSTOM"]).optional(),
});

export async function POST(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 },
    );
  }

  if (!isValidSlug(parsed.data.slug)) {
    return NextResponse.json(
      { error: "כתובת לא תקינה (למשל: ahmed או ahmed-clinic)" },
      { status: 400 },
    );
  }

  try {
    const vet = await createVet(parsed.data);
    return NextResponse.json({
      vet: {
        id: vet.id,
        slug: vet.slug,
        displayName: vet.displayName,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "לא ניתן ליצור וטרינר";
    if (message.includes("Unique") || message.includes("unique")) {
      return NextResponse.json(
        { error: "שם משתמש או כתובת כבר קיימים" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
  displayName: z.string().min(2).max(80).optional(),
  clinicName: z.string().max(80).nullable().optional(),
  locale: z.enum(["he", "ar"]).optional(),
  plan: z.enum(["BASE", "CUSTOM"]).optional(),
  phone: z.string().max(30).nullable().optional(),
});

export async function PATCH(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  if (parsed.data.password) {
    await resetVetPassword(parsed.data.id, parsed.data.password);
  }

  const vet = await prisma.veterinarian.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.displayName
        ? { displayName: parsed.data.displayName.trim() }
        : {}),
      ...(parsed.data.clinicName !== undefined
        ? { clinicName: parsed.data.clinicName?.trim() || null }
        : {}),
      ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
      ...(parsed.data.plan ? { plan: parsed.data.plan } : {}),
      ...(parsed.data.phone !== undefined
        ? {
            phone: (() => {
              const raw = parsed.data.phone?.trim() || "";
              if (!raw) return null;
              const normalized = normalizePhone(raw);
              return isValidMobile(normalized) ? normalized : raw;
            })(),
          }
        : {}),
    },
  });

  return NextResponse.json({
    vet: {
      id: vet.id,
      slug: vet.slug,
      displayName: vet.displayName,
      isActive: vet.isActive,
      locale: vet.locale,
      plan: vet.plan,
    },
  });
}

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  await prisma.veterinarian.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
