import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** L'édition se fait depuis la fiche (modales par section) : ancienne URL conservée pour les liens existants. */
export default async function EditCandidatePage({ params }: Props) {
  const { id } = await params;
  redirect(`/candidates/${encodeURIComponent(id)}`);
}
