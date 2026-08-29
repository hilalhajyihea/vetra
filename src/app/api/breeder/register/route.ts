import { NextResponse } from "next/server";
import { z } from "zod";
import { registerBreeder } from "@/lib/breeders";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  slug: z.string().min(1),
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  farmName: z.string().min(2).max(80),
  phone: z.string().min(8).max(20),
  email: z.string().email().max(120),
  password: z.string().min(6).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: t("he", "errInvalidData") },
        { status: 400 },
      );
    }

    const vet = await prisma.veterinarian.findUnique({
      where: { slug: parsed.data.slug },
      select: { locale: true },
    });
    const locale = normalizeLocale(vet?.locale);

    try {
      await registerBreeder(parsed.data);
      return NextResponse.json({ ok: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "PHONE_INVALID") {
        return NextResponse.json(
          { error: t(locale, "errPhoneInvalid") },
          { status: 400 },
        );
      }
      if (code === "PHONE_TAKEN") {
        return NextResponse.json(
          { error: t(locale, "errPhoneTaken") },
          { status: 409 },
        );
      }
      if (code === "CLINIC_NOT_FOUND") {
        return NextResponse.json(
          { error: t(locale, "errClinicMissing") },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("breeder register error", error);
    return NextResponse.json({ error: t("he", "errServer") }, { status: 500 });
  }
}
