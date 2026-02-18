"use client";

import { CandidateExperiencesSection } from "@/components/candidates/CandidateExperiencesSection";
import { CandidateFormationsSection } from "@/components/candidates/CandidateFormationsSection";
import type { ExperienceItem } from "@/components/candidates/ExperienceFormDialog";
import type { FormationItem } from "@/components/candidates/FormationFormDialog";

export type { ExperienceItem, FormationItem };

export type CandidateDetailContentProps = {
  candidateId?: string;
  experiences: ExperienceItem[];
  formations: FormationItem[];
};

export const CandidateDetailContent = ({
  candidateId,
  experiences,
  formations,
}: CandidateDetailContentProps) => (
  <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm print:shadow-none">
    <CandidateExperiencesSection
      candidateId={candidateId}
      experiences={experiences}
    />
    <CandidateFormationsSection
      candidateId={candidateId}
      formations={formations}
    />
  </div>
);
