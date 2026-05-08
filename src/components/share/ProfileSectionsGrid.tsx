import type { LanguageLevel } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"

const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  NOTION: "Notions",
  INTERMEDIATE: "Intermédiaire",
  FLUENT: "Courant",
  BILINGUAL: "Bilingue",
  NATIVE: "Natif",
}

type Props = {
  summary: string | null
  languages: Array<{ id: string; name: string; level: LanguageLevel }>
  experiences: Array<{
    id: string
    title: string
    company: string
    startDate: Date | string
    endDate: Date | string | null
    description: string | null
  }>
  formations: Array<{
    id: string
    degree: string
    field: string | null
    school: string
    startDate: Date | string | null
    endDate: Date | string | null
  }>
}

export const ProfileSectionsGrid = ({
  summary,
  languages,
  experiences,
  formations,
}: Props) => (
  <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
    {/* Sidebar : résumé + langues */}
    <aside className="min-w-0 space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      {/* Résumé */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Résumé</h2>
        {summary ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground/60">
            Aucun résumé renseigné
          </p>
        )}
      </section>

      {/* Langues */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Langues</h2>
        {languages.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {languages.map((lang) => (
              <Badge key={lang.id} variant="secondary">
                {lang.name}
                {" — "}
                {LANGUAGE_LEVEL_LABELS[lang.level] ?? lang.level}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground/60">
            Aucune langue renseignée
          </p>
        )}
      </section>
    </aside>

    {/* Contenu : expériences + formations */}
    <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      {/* Expériences */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Expériences</h2>
        {experiences.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucune expérience ajoutée
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {experiences.map((exp) => (
              <li
                key={exp.id}
                className="rounded-lg border border-border bg-card p-4 text-sm"
              >
                <p className="font-medium text-foreground">{exp.title}</p>
                <p className="text-muted-foreground">
                  {exp.company} — {formatDate(exp.startDate)}
                  {exp.endDate
                    ? ` – ${formatDate(exp.endDate)}`
                    : " – Aujourd'hui"}
                </p>
                {exp.description && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Formations */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Formations</h2>
        {formations.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucune formation ajoutée
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {formations.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-border bg-card p-4 text-sm"
              >
                <p className="font-medium text-foreground">
                  {f.degree}
                  {f.field ? ` — ${f.field}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {f.school}
                  {(f.startDate ?? f.endDate) &&
                    ` — ${f.startDate ? formatDate(f.startDate) : "?"}${
                      f.endDate ? ` – ${formatDate(f.endDate)}` : ""
                    }`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  </div>
)
