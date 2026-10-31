"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { formatCandidateCities } from "@/lib/candidate-utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CandidateDetailSkeleton } from "./CandidateDetailSkeleton";
import { CandidateDetailHeader } from "./CandidateDetailHeader";
import { CandidateDetailSidebar } from "./CandidateDetailSidebar";
import { CandidateDetailContent } from "./CandidateDetailContent";
import { CandidateNotesSection } from "./CandidateNotesSection";
import { CandidateCandidaturesSection } from "./CandidateCandidaturesSection";
import { ShareLinkDialog } from "./ShareLinkDialog";
import { CandidateIdentityDialog } from "./CandidateIdentityDialog";

type Props = { candidateId: string };

export const CandidateDetailView = ({ candidateId }: Props) => {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const utils = api.useUtils();
  const getByIdQuery = api.candidate.getById.useQuery({ id: candidateId });
  const deleteMutation = api.candidate.delete.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      void utils.candidate.list.invalidate();
      router.push("/candidates");
    },
  });

  const handleConfirmDelete = () => {
    deleteMutation.mutate({ id: candidateId });
  };

  if (getByIdQuery.isLoading) {
    return (
      <main className="p-6 lg:p-10">
        <CandidateDetailSkeleton />
      </main>
    );
  }

  if (getByIdQuery.error ?? !getByIdQuery.data) {
    return (
      <main className="p-6 lg:p-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">
            Candidat introuvable ou vous n'avez pas accès à cette fiche.
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/candidates">Retour à la liste</Link>
          </Button>
        </div>
      </main>
    );
  }

  const candidate = getByIdQuery.data;
  const citiesLabel = formatCandidateCities(candidate.cities);

  return (
    <main className="p-6 lg:p-10 print:bg-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/candidates">Retour</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
          >
            <Share2 className="size-3.5" aria-hidden />
            Partager
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>

        <CandidateDetailHeader
          photoUrl={candidate.photoUrl}
          firstName={candidate.firstName}
          lastName={candidate.lastName}
          title={candidate.title}
          city={citiesLabel}
          email={candidate.email}
          phone={candidate.phone}
          linkedinUrl={candidate.linkedinUrl}
          onEdit={() => setIdentityDialogOpen(true)}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <CandidateDetailSidebar
            candidateId={candidateId}
            languages={candidate.languages}
            tags={candidate.tags}
            summary={candidate.summary}
            cvUrl={candidate.cvUrl}
            cvFileName={candidate.cvFileName}
          />
          <CandidateDetailContent
            candidateId={candidateId}
            experiences={candidate.experiences}
            formations={candidate.formations}
          />
        </div>

        <CandidateCandidaturesSection candidateId={candidateId} candidatures={candidate.candidatures} />
        <CandidateNotesSection candidateId={candidateId} />
      </div>

      <CandidateIdentityDialog
        open={identityDialogOpen}
        onOpenChange={setIdentityDialogOpen}
        candidate={{
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          linkedinUrl: candidate.linkedinUrl,
          title: candidate.title,
          photoUrl: candidate.photoUrl,
          cities: candidate.cities.map((candidateCity) => ({
            id: candidateCity.city.id,
            name: candidateCity.city.name,
            region: candidateCity.city.region,
            country: candidateCity.city.country,
          })),
        }}
      />

      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        candidateId={candidateId}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer ce candidat ?"
        description="Cette action est irréversible. Le candidat et toutes les données associées seront définitivement supprimés."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        pendingLabel="Suppression…"
        onConfirm={handleConfirmDelete}
        pending={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </main>
  );
};
