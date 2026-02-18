import type { Metadata } from "next";
import { CandidateDetailView } from "@/components/candidates/CandidateDetailView";

export const metadata: Metadata = {
  title: "Fiche candidat | Claritee ATS",
  description: "Détail du candidat",
};

type Props = { params: Promise<{ id: string }> };

export default async function CandidateDetailPage({ params }: Props) {
  const { id } = await params;
  return <CandidateDetailView candidateId={id} />;
}
