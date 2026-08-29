import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { authenticateVet } from "@/lib/vets";

const schema = z.object({
  username: z.string().min(1),
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

    const existing = await prisma.veterinarian.findUnique({
      where: { username: parsed.data.username },
      select: { locale: true },
    });
    const locale = normalizeLocale(existing?.locale);

    const vet = await authenticateVet(
      parsed.data.username,
      parsed.data.password,
    );
    if (!vet) {
      return NextResponse.json(
        { error: t(locale, "errBadCredentials") },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      kind: "vet",
      vetId: vet.id,
      username: vet.username,
      displayName: vet.displayName,
      slug: vet.slug,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      vet: {
        id: vet.id,
        slug: vet.slug,
        displayName: vet.displayName,
      },
    });
  } catch (error) {
    console.error("vet login error", error);
    return NextResponse.json({ error: t("he", "errServer") }, { status: 500 });
  }
}
