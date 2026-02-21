"use client"

import { CandidateSummarySection } from "./CandidateSummarySection"
import { CandidateLanguagesSection } from "./CandidateLanguagesSection"
import { CandidateTagsSection, type TagItem } from "./CandidateTagsSection"
import { CandidateCvSection } from "./CandidateCvSection"

export type LanguageItem = { id: string; name: string; level: string }
export type { TagItem }

export type CandidateDetailSidebarProps = {
  candidateId: string
  languages: LanguageItem[]
  tags: TagItem[]
  summary: string | null
  cvUrl: string | null
  cvFileName: string | null
}

export const CandidateDetailSidebar = ({
  candidateId,
  languages,
  tags,
  summary,
  cvUrl,
  cvFileName,
}: CandidateDetailSidebarProps) => (
  <aside className="min-w-0 space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm print:shadow-none">
    <CandidateSummarySection candidateId={candidateId} summary={summary} />
    <CandidateCvSection
      candidateId={candidateId}
      cvUrl={cvUrl}
      cvFileName={cvFileName}
    />
    <CandidateLanguagesSection candidateId={candidateId} languages={languages} />
    <CandidateTagsSection candidateId={candidateId} tags={tags} />
  </aside>
)
