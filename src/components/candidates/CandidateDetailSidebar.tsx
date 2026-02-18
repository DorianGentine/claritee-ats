"use client";

import { CandidateSummarySection } from "./CandidateSummarySection";
import { CandidateLanguagesSection } from "./CandidateLanguagesSection";

export type LanguageItem = { id: string; name: string; level: string };
export type TagItem = { id: string; name: string; color: string };

export type CandidateDetailSidebarProps = {
  candidateId: string;
  languages: LanguageItem[];
  tags: TagItem[];
  summary: string | null;
};

export const CandidateDetailSidebar = ({
  candidateId,
  languages,
  tags,
  summary,
}: CandidateDetailSidebarProps) => (
  <aside className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm print:shadow-none">
    <CandidateSummarySection candidateId={candidateId} summary={summary} />
    <CandidateLanguagesSection candidateId={candidateId} languages={languages} />
    {tags.length > 0 && (
      <section>
        <h2 className="text-lg font-semibold text-foreground">Tags</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-md border border-border px-2 py-0.5 text-xs font-medium"
              style={
                tag.color
                  ? {
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color,
                    }
                  : undefined
              }
            >
              {tag.name}
            </span>
          ))}
        </div>
      </section>
    )}
  </aside>
);
