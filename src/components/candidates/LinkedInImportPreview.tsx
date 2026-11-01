"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { LinkedInProfileDraft } from "@/lib/linkedin/profile";
import { LANGUAGE_LEVEL_LABELS } from "@/lib/candidate-utils";
import { formatDate } from "@/lib/format";
import {
  LANGUAGE_LEVELS,
  languageLevelSchema,
} from "@/lib/validations/candidate";
import { getTagBadgeStyle, getTagColor } from "@/lib/tag-colors";
import { MAX_TAGS_PER_CANDIDATE } from "@/lib/validations/tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Partie du brouillon LinkedIn créée avec la fiche (hors champs du formulaire) */
export type ImportedBackground = Pick<
  LinkedInProfileDraft,
  "summary" | "experiences" | "formations" | "languages" | "skills"
>;

type Props = {
  value: ImportedBackground;
  onChange: (value: ImportedBackground) => void;
  disabled?: boolean;
};

const formatPeriod = (startDate: string | null, endDate: string | null) => {
  if (!startDate && !endDate) return null;
  const start = startDate ? formatDate(startDate) : "?";
  return `${start} – ${endDate ? formatDate(endDate) : "aujourd'hui"}`;
};

const withoutIndex = <Item,>(items: Item[], removedIndex: number): Item[] =>
  items.filter((_item, index) => index !== removedIndex);

const PreviewGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <ul className="space-y-1.5">{children}</ul>
  </div>
);

const PreviewItem = ({
  label,
  onRemove,
  disabled,
  children,
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <li className="flex items-start justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
    <div className="min-w-0">{children}</div>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onRemove}
      disabled={disabled}
      aria-label={`Retirer ${label}`}
      className="shrink-0"
    >
      <X aria-hidden />
    </Button>
  </li>
);

/**
 * Aperçu du parcours importé depuis LinkedIn (résumé, expériences, formations,
 * langues) : le recruteur retire ce qu'il ne veut pas garder avant d'enregistrer.
 */
export const LinkedInImportPreview = ({ value, onChange, disabled }: Props) => {
  const { summary, experiences, formations, languages, skills } = value;
  const hasLanguageWithoutLevel = languages.some((language) => language.level === null);

  const handleLanguageLevelChange = (languageIndex: number, level: string) => {
    const parsedLevel = languageLevelSchema.safeParse(level);
    if (!parsedLevel.success) return;
    onChange({
      ...value,
      languages: languages.map((language, index) =>
        index === languageIndex ? { ...language, level: parsedLevel.data } : language
      ),
    });
  };
  const isEmpty =
    !summary &&
    experiences.length === 0 &&
    formations.length === 0 &&
    languages.length === 0 &&
    skills.length === 0;

  if (isEmpty) return null;

  return (
    <section
      aria-labelledby="linkedin-preview-title"
      className="space-y-4 rounded-lg border border-dashed border-border p-4"
    >
      <div>
        <h2 id="linkedin-preview-title" className="text-base font-semibold text-foreground">
          Également importé depuis LinkedIn
        </h2>
        <p className="text-sm text-muted-foreground">
          Créé avec la fiche ; vous pourrez tout modifier ensuite.
        </p>
      </div>

      {summary && (
        <PreviewGroup title="Résumé">
          <PreviewItem
            label="le résumé"
            onRemove={() => onChange({ ...value, summary: null })}
            disabled={disabled}
          >
            <p className="line-clamp-4 whitespace-pre-line text-muted-foreground">{summary}</p>
          </PreviewItem>
        </PreviewGroup>
      )}

      {experiences.length > 0 && (
        <PreviewGroup title={`Expériences (${experiences.length})`}>
          {experiences.map((experience, index) => (
            <PreviewItem
              key={`${experience.company}-${experience.startDate}-${index}`}
              label={`l'expérience ${experience.title} chez ${experience.company}`}
              onRemove={() =>
                onChange({ ...value, experiences: withoutIndex(experiences, index) })
              }
              disabled={disabled}
            >
              <p className="font-medium text-foreground">
                {experience.title} · {experience.company}
              </p>
              <p className="text-muted-foreground">
                {formatPeriod(experience.startDate, experience.endDate)}
              </p>
            </PreviewItem>
          ))}
        </PreviewGroup>
      )}

      {formations.length > 0 && (
        <PreviewGroup title={`Formations (${formations.length})`}>
          {formations.map((formation, index) => (
            <PreviewItem
              key={`${formation.school}-${index}`}
              label={`la formation ${formation.degree} à ${formation.school}`}
              onRemove={() =>
                onChange({ ...value, formations: withoutIndex(formations, index) })
              }
              disabled={disabled}
            >
              <p className="font-medium text-foreground">
                {formation.degree}
                {formation.field && formation.field !== formation.degree
                  ? `, ${formation.field}`
                  : ""}
              </p>
              <p className="text-muted-foreground">
                {[formation.school, formatPeriod(formation.startDate, formation.endDate)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </PreviewItem>
          ))}
        </PreviewGroup>
      )}

      {languages.length > 0 && (
        <PreviewGroup title={`Langues (${languages.length})`}>
          {hasLanguageWithoutLevel && (
            <li className="text-sm text-muted-foreground">
              LinkedIn ne précise pas toujours le niveau : choisissez-le, sinon la
              langue ne sera pas ajoutée.
            </li>
          )}
          {languages.map((language, index) => (
            <PreviewItem
              key={language.name}
              label={`la langue ${language.name}`}
              onRemove={() =>
                onChange({ ...value, languages: withoutIndex(languages, index) })
              }
              disabled={disabled}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground">{language.name}</span>
                <Select
                  value={language.level ?? ""}
                  onValueChange={(level) => handleLanguageLevelChange(index, level)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-40 bg-card"
                    aria-label={`Niveau en ${language.name}`}
                  >
                    <SelectValue placeholder="Niveau à préciser" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {LANGUAGE_LEVEL_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PreviewItem>
          ))}
        </PreviewGroup>
      )}

      {skills.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Compétences ajoutées en tags ({skills.length}/{MAX_TAGS_PER_CANDIDATE})
          </h3>
          <ul className="flex flex-wrap gap-2" aria-label="Compétences importées">
            {skills.map((skill) => (
              <li key={skill}>
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1"
                  style={getTagBadgeStyle(getTagColor(skill))}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        skills: skills.filter((currentSkill) => currentSkill !== skill),
                      })
                    }
                    disabled={disabled}
                    aria-label={`Retirer le tag ${skill}`}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-secondary-foreground/20 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
