"use client";

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  NOTION: "Notion",
  INTERMEDIATE: "Intermédiaire",
  FLUENT: "Courant",
  BILINGUAL: "Bilingue",
  NATIVE: "Natif",
};

export type LanguageItem = { id: string; name: string; level: string };
export type TagItem = { id: string; name: string; color: string };

export type CandidateDetailSidebarProps = {
  languages: LanguageItem[];
  tags: TagItem[];
  summary: string | null;
};

export const CandidateDetailSidebar = ({
  languages,
  tags,
  summary,
}: CandidateDetailSidebarProps) => (
  <aside className="space-y-6">
    {summary && (
      <section>
        <h2 className="text-lg font-semibold text-foreground">Résumé</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {summary}
        </p>
      </section>
    )}
    {languages.length > 0 && (
      <section>
        <h2 className="text-lg font-semibold text-foreground">Langues</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {languages.map((lang) => (
            <li key={lang.id}>
              {lang.name} — {LANGUAGE_LEVEL_LABELS[lang.level] ?? lang.level}
            </li>
          ))}
        </ul>
      </section>
    )}
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
