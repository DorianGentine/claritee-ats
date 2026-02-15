import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiche candidat | Claritee ATS",
  description: "Détail du candidat",
};

type Props = { params: Promise<{ id: string }> };

export default async function CandidateDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Fiche candidat
        </h1>
        <p className="mt-2 text-muted-foreground">
          Détail du candidat (bientôt disponible). ID : {id}
        </p>
      </div>
    </main>
  );
}
