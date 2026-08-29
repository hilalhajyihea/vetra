import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vetra · כניסת מנהל מערכת",
};

export default async function PlatformLoginPage() {
  const session = await getSession();
  if (session?.kind === "platform") {
    redirect("/platform");
  }

  return (
    <main className="shop-shell flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <LoginForm
        endpoint="/api/auth/platform/login"
        title={t("he", "platformLoginTitle")}
        subtitle={t("he", "platformLoginSubtitle")}
        redirectTo="/platform"
      />
      <Link
        href="/"
        className="rounded-xl border border-white/20 px-4 py-2 text-sm text-[var(--cream)] transition hover:bg-white/10"
      >
        {t("he", "backHome")}
      </Link>
    </main>
  );
}
