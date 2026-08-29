import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { authenticateBreeder } from "@/lib/breeders";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(8),
  password: z.string().min(1),
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

    const result = await authenticateBreeder(
      parsed.data.slug,
      parsed.data.phone,
      parsed.data.password,
    );

    if ("error" in result) {
      if (result.error === "PENDING") {
        return NextResponse.json(
          { error: t(locale, "errPending") },
          { status: 403 },
        );
      }
      if (result.error === "REJECTED") {
        return NextResponse.json(
          { error: t(locale, "errRejected") },
          { status: 403 },
        );
      }
      if (result.error === "CLINIC_NOT_FOUND") {
        return NextResponse.json(
          { error: t(locale, "errClinicMissing") },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: t(locale, "errBadCredentials") },
        { status: 401 },
      );
    }

    const { breeder } = result;
    const token = await createSessionToken({
      kind: "breeder",
      breederId: breeder.id,
      vetId: breeder.veterinarianId,
      slug: parsed.data.slug,
      firstName: breeder.firstName,
      lastName: breeder.lastName,
      farmName: breeder.farmName,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      redirectTo: `/${parsed.data.slug}/breeder`,
    });
  } catch (error) {
    console.error("breeder login error", error);
    return NextResponse.json({ error: t("he", "errServer") }, { status: 500 });
  }
}
