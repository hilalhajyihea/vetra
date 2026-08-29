import type { Metadata } from "next";

const HOME_SITE_NAME = "Vetra";
const HOME_DESCRIPTION =
  "Vetra — ניהול גידולים וחיסונים לווטרינר ולמגדל. إدارة القطعان والتطعيمات للطبيب البيطري وللمربّي.";

function normalizeSiteUrl(raw: string) {
  let url = raw.trim().replace(/\/$/, "");
  while (/^https?:\/\/https?:\/\//i.test(url)) {
    url = url.replace(/^https?:\/\//i, "");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "";
  if (fromEnv) return normalizeSiteUrl(fromEnv);
  return "https://vetra.onrender.com";
}

export function homeMetadata(): Metadata {
  const title = `${HOME_SITE_NAME} · וטרינרים ומגדלים`;
  const description = HOME_DESCRIPTION;
  const url = getSiteUrl();

  return {
    title: {
      default: title,
      template: `%s · ${HOME_SITE_NAME}`,
    },
    description,
    metadataBase: new URL(url),
    openGraph: {
      type: "website",
      locale: "he_IL",
      alternateLocale: ["ar_IL"],
      siteName: HOME_SITE_NAME,
      title,
      description,
      url,
    },
  };
}

export function vetShareMetadata(displayName: string, slug: string): Metadata {
  const title = `Vetra · ${displayName}`;
  const description = `${displayName} — Vetra`;
  const url = `${getSiteUrl()}/${slug}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "he_IL",
      alternateLocale: ["ar_IL"],
      siteName: HOME_SITE_NAME,
      title,
      description,
      url,
    },
  };
}
