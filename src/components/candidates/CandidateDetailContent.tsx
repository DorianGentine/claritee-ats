"use client";

import { formatDate } from "@/lib/format";

export type ExperienceItem = {
  id: string;
  title: string;
  company: string;
  startDate: Date | string;
  endDate: Date | string | null;
  description: string | null;
};

export type FormationItem = {
  id: string;
  degree: string;
  field: string | null;
  school: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

export type CandidateDetailContentProps = {
  experiences: ExperienceItem[];
  formations: FormationItem[];
};

export const CandidateDetailContent = ({
  experiences,
  formations,
}: CandidateDetailContentProps) => (
  <div className="space-y-6">
    <section>
      <h2 className="text-lg font-semibold text-foreground">Expériences</h2>
      {experiences.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune expérience</p>
      ) : (
        <ul className="mt-2 space-y-4">
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
    <section>
      <h2 className="text-lg font-semibold text-foreground">Formations</h2>
      {formations.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune formation</p>
      ) : (
        <ul className="mt-2 space-y-4">
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
                {(f.startDate || f.endDate) &&
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
);
