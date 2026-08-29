import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string; breederId: string }> };

export default async function VetFarmIndexPage({ params }: Props) {
  const { slug, breederId } = await params;
  redirect(`/${slug}/admin/farm/${breederId}/herd`);
}
