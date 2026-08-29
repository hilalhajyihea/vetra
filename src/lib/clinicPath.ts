import { RESERVED_SLUGS } from "@/lib/vets";

export function clinicSlugFromPathname(pathname: string | null | undefined) {
  const segment = (pathname || "").split("/").filter(Boolean)[0];
  if (!segment || RESERVED_SLUGS.has(segment)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment)) return null;
  return segment;
}

export function clinicHomeFromPathname(pathname: string | null | undefined) {
  const slug = clinicSlugFromPathname(pathname);
  if (!slug) return "/";

  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${slug}`;
}
