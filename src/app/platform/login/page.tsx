import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";

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
        titleKey="platformLoginTitle"
        subtitleKey="platformLoginSubtitle"
        redirectTo="/platform"
        backHref="/"
        backKey="backHome"
      />
    </main>
  );
}
