import { z } from "zod";
import type { LANGUAGE_LEVELS } from "@/lib/validations/candidate";
// Import relatif : ce module est aussi chargé par un script tsx (hors alias Next)
import { MAX_TAGS_PER_CANDIDATE } from "../validations/tag";

/**
 * Import LinkedIn : conversion d'un profil renvoyé par un acteur Apify en
 * brouillon de fiche candidat. Chaque acteur a son format : il est d'abord
 * ramené à un profil normalisé (`NormalizedProfile`), puis nettoyé par `buildDraft`.
 * Acteurs gérés : `supreme_coder/linkedin-profile-scraper` (principal) et
 * `harvestapi/linkedin-profile-scraper` (secours, plafonné à 50 runs en plan gratuit).
 *
 * Module pur (aucun appel réseau) : partagé par le router tRPC et le script
 * de vérification quotidienne (`scripts/check-linkedin-import.ts`).
 */

export type LinkedInLanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export type LinkedInExperienceDraft = {
  title: string;
  company: string;
  /** Premier jour du mois, au format YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type LinkedInFormationDraft = {
  degree: string;
  field: string | null;
  school: string;
  startDate: string | null;
  endDate: string | null;
};

export type LinkedInLanguageDraft = {
  name: string;
  /** null quand LinkedIn ne donne pas de niveau : à choisir par le recruteur */
  level: LinkedInLanguageLevel | null;
};

export type LinkedInProfileDraft = {
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  title: string | null;
  summary: string | null;
  /** Ville telle que LinkedIn la donne : à résoudre côté client via l'autocomplete */
  cityName: string | null;
  experiences: LinkedInExperienceDraft[];
  formations: LinkedInFormationDraft[];
  languages: LinkedInLanguageDraft[];
  /** Compétences, dans l'ordre du profil, proposées comme tags (20 max) */
  skills: string[];
};

/** Limites alignées sur les schémas de création (résumé 500, description 2000) */
export const SUMMARY_MAX_LENGTH = 500;
export const EXPERIENCE_DESCRIPTION_MAX_LENGTH = 2000;
/** Longueur maximale d'un nom de tag (tagNameSchema) */
const TAG_NAME_MAX_LENGTH = 100;

const optionalText = z.string().nullish().catch(null);

const linkedInDateSchema = z
  .object({
    month: z.union([z.string(), z.number()]).nullish(),
    year: z.number().nullish(),
  })
  .nullish()
  .catch(null);

type LinkedInDate = z.infer<typeof linkedInDateSchema>;

/** Profil commun aux acteurs, avant nettoyage (valeurs brutes, éventuellement vides) */
type NormalizedProfile = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  linkedinUrl: string | null | undefined;
  headline: string | null | undefined;
  about: string | null | undefined;
  /** Ville seule, ou libellé complet « Lyon, Auvergne-Rhône-Alpes, France » */
  location: string | null | undefined;
  experiences: Array<{
    title: string | null | undefined;
    company: string | null | undefined;
    description: string | null | undefined;
    startDate: LinkedInDate;
    endDate: LinkedInDate;
  }>;
  formations: Array<{
    school: string | null | undefined;
    degree: string | null | undefined;
    field: string | null | undefined;
    startDate: LinkedInDate;
    endDate: LinkedInDate;
  }>;
  languages: Array<{ name?: string | null; proficiency?: string | null }>;
  skills: Array<{ name?: string | null }>;
};

/** Liste tolérante : un format inattendu donne une liste vide plutôt qu'un échec */
const lenientArray = <Item extends z.ZodType>(item: Item) =>
  z.array(item).nullish().catch(null).transform((items) => items ?? []);

/** Sortie de `supreme_coder/linkedin-profile-scraper` */
const supremeCoderProfileSchema = z
  .object({
    firstName: optionalText,
    lastName: optionalText,
    inputUrl: optionalText,
    publicIdentifier: optionalText,
    headline: optionalText,
    summary: optionalText,
    geoLocationName: optionalText,
    positions: lenientArray(
      z.object({
        title: optionalText,
        description: optionalText,
        company: z.object({ name: optionalText }).nullish().catch(null),
        timePeriod: z
          .object({ startDate: linkedInDateSchema, endDate: linkedInDateSchema })
          .nullish()
          .catch(null),
      })
    ),
    educations: lenientArray(
      z.object({
        schoolName: optionalText,
        degreeName: optionalText,
        fieldOfStudy: optionalText,
        timePeriod: z
          .object({ startDate: linkedInDateSchema, endDate: linkedInDateSchema })
          .nullish()
          .catch(null),
      })
    ),
    languages: lenientArray(
      z.object({ name: optionalText, proficiency: optionalText })
    ),
    skills: lenientArray(z.object({ name: optionalText })),
  })
  .transform(
    (profile): NormalizedProfile => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      linkedinUrl: profile.publicIdentifier
        ? `https://www.linkedin.com/in/${profile.publicIdentifier}`
        : profile.inputUrl,
      headline: profile.headline,
      about: profile.summary,
      location: profile.geoLocationName,
      experiences: profile.positions.map((position) => ({
        title: position.title,
        company: position.company?.name,
        description: position.description,
        startDate: position.timePeriod?.startDate ?? null,
        endDate: position.timePeriod?.endDate ?? null,
      })),
      formations: profile.educations.map((education) => ({
        school: education.schoolName,
        degree: education.degreeName,
        field: education.fieldOfStudy,
        startDate: education.timePeriod?.startDate ?? null,
        endDate: education.timePeriod?.endDate ?? null,
      })),
      languages: profile.languages,
      skills: profile.skills,
    })
  );

/** Sortie de `harvestapi/linkedin-profile-scraper` */
const harvestApiProfileSchema = z
  .object({
    firstName: optionalText,
    lastName: optionalText,
    linkedinUrl: optionalText,
    headline: optionalText,
    about: optionalText,
    location: z
      .object({
        linkedinText: optionalText,
        parsed: z.object({ city: optionalText }).nullish().catch(null),
      })
      .nullish()
      .catch(null),
    experience: lenientArray(
      z.object({
        position: optionalText,
        companyName: optionalText,
        description: optionalText,
        startDate: linkedInDateSchema,
        endDate: linkedInDateSchema,
      })
    ),
    education: lenientArray(
      z.object({
        schoolName: optionalText,
        degree: optionalText,
        fieldOfStudy: optionalText,
        startDate: linkedInDateSchema,
        endDate: linkedInDateSchema,
      })
    ),
    languages: lenientArray(
      z.object({ name: optionalText, proficiency: optionalText })
    ),
    skills: lenientArray(z.object({ name: optionalText })),
  })
  .transform(
    (profile): NormalizedProfile => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      linkedinUrl: profile.linkedinUrl,
      headline: profile.headline,
      about: profile.about,
      location: profile.location?.parsed?.city || profile.location?.linkedinText,
      experiences: profile.experience.map((experience) => ({
        title: experience.position,
        company: experience.companyName,
        description: experience.description,
        startDate: experience.startDate,
        endDate: experience.endDate,
      })),
      formations: profile.education.map((education) => ({
        school: education.schoolName,
        degree: education.degree,
        field: education.fieldOfStudy,
        startDate: education.startDate,
        endDate: education.endDate,
      })),
      languages: profile.languages,
      skills: profile.skills,
    })
  );

const MONTHS_BY_PREFIX: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, fév: 2, mar: 3, apr: 4, avr: 4, may: 5, mai: 5,
  jun: 6, jui: 6, jul: 7, aug: 8, aou: 8, aoû: 8, sep: 9, oct: 10, nov: 11,
  dec: 12, déc: 12,
};

/** « Nov », « November », « nov. », 11 → 11 ; inconnu → janvier. */
const parseMonth = (month: string | number | null | undefined): number => {
  if (typeof month === "number") {
    return month >= 1 && month <= 12 ? month : 1;
  }
  if (!month) return 1;
  const normalized = month.trim().toLowerCase();
  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;
  // « juil » (juillet) avant « jui » (juin)
  if (normalized.startsWith("juil")) return 7;
  return MONTHS_BY_PREFIX[normalized.slice(0, 3)] ?? 1;
};

/** Date LinkedIn { month, year } → « YYYY-MM-01 » ; sans année → null. */
export const toMonthDate = (date: LinkedInDate): string | null => {
  if (!date?.year) return null;
  const month = String(parseMonth(date.month)).padStart(2, "0");
  return `${date.year}-${month}-01`;
};

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;

const cleanText = (text: string | null | undefined): string | null =>
  text?.trim() || null;

/**
 * Proficiency LinkedIn (anglais ou français) → niveau Claritee ; null si absente
 * ou inconnue (on ne devine pas un niveau).
 */
export const mapProficiency = (
  proficiency: string | null | undefined
): LinkedInLanguageLevel | null => {
  // Libellés (« Full professional proficiency ») ou constantes (« FULL_PROFESSIONAL »)
  const normalized = proficiency?.toLowerCase().replaceAll("_", " ") ?? "";
  if (/native|bilingual|natale|bilingue/.test(normalized)) return "NATIVE";
  if (/full professional|complète|complete/.test(normalized)) return "FLUENT";
  if (/professional working|professionnelle/.test(normalized)) {
    return /limited|limitée/.test(normalized) ? "INTERMEDIATE" : "FLUENT";
  }
  if (/limited|limitée/.test(normalized)) return "INTERMEDIATE";
  if (/elementary|notions|élémentaire/.test(normalized)) return "NOTION";
  return null;
};

const LANGUAGE_NAMES_FR: Record<string, string> = {
  english: "Anglais",
  french: "Français",
  spanish: "Espagnol",
  german: "Allemand",
  italian: "Italien",
  portuguese: "Portugais",
  dutch: "Néerlandais",
  russian: "Russe",
  chinese: "Chinois",
  mandarin: "Chinois",
  japanese: "Japonais",
  arabic: "Arabe",
  polish: "Polonais",
  turkish: "Turc",
  korean: "Coréen",
  hindi: "Hindi",
};

/** Nom de langue LinkedIn → libellé français (« English » → « Anglais »). */
export const translateLanguageName = (name: string): string => {
  const trimmed = name.trim();
  const translated = LANGUAGE_NAMES_FR[trimmed.toLowerCase()];
  if (translated) return translated;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Ville depuis le libellé LinkedIn : « Lyon, Auvergne-Rhône-Alpes, France » → Lyon,
 * « Greater Paris Metropolitan Region » → Paris, « Région de Nantes » → Nantes.
 */
export const extractCityName = (location: string | null | undefined): string | null => {
  const firstPart = cleanText(location?.split(",")[0]);
  if (!firstPart) return null;
  return (
    cleanText(
      firstPart
        .replace(/^greater\s+/i, "")
        .replace(/\s+(metropolitan\s+)?(region|area)$/i, "")
        .replace(/^(grande\s+)?r[ée]gion\s+(de\s+|d['’]\s*)?/i, "")
    ) ?? firstPart
  );
};

/** Nettoie un profil normalisé ; null sans prénom ou nom. */
const buildDraft = (
  profile: NormalizedProfile,
  requestedUrl: string
): LinkedInProfileDraft | null => {
  const firstName = cleanText(profile.firstName);
  const lastName = cleanText(profile.lastName);
  if (!firstName || !lastName) return null;

  const experiences = profile.experiences.flatMap((experience) => {
    const title = cleanText(experience.title);
    const company = cleanText(experience.company);
    const startDate = toMonthDate(experience.startDate);
    // Titre, entreprise et date de début sont obligatoires pour une expérience
    if (!title || !company || !startDate) return [];
    const description = cleanText(experience.description);
    return [
      {
        title,
        company,
        startDate,
        endDate: toMonthDate(experience.endDate),
        description: description
          ? truncate(description, EXPERIENCE_DESCRIPTION_MAX_LENGTH)
          : null,
      },
    ];
  });

  const formations = profile.formations.flatMap((education) => {
    const school = cleanText(education.school);
    if (!school) return [];
    const field = cleanText(education.field);
    return [
      {
        // Le diplôme est requis : à défaut, on reprend le domaine d'études
        degree: cleanText(education.degree) ?? field ?? "Formation",
        field,
        school,
        startDate: toMonthDate(education.startDate),
        endDate: toMonthDate(education.endDate),
      },
    ];
  });

  const seenLanguageNames = new Set<string>();
  const languages = profile.languages.flatMap((language) => {
    const rawName = cleanText(language.name);
    if (!rawName) return [];
    const name = translateLanguageName(rawName);
    if (seenLanguageNames.has(name.toLowerCase())) return [];
    seenLanguageNames.add(name.toLowerCase());
    return [{ name, level: mapProficiency(language.proficiency) }];
  });

  // Compétences sans date sur LinkedIn : on garde l'ordre du profil (compétences
  // principales en tête), dédoublonné, borné à la limite de tags d'un candidat.
  const seenSkillNames = new Set<string>();
  const skills = profile.skills
    .flatMap((skill) => {
      const name = cleanText(skill.name);
      if (!name || name.length > TAG_NAME_MAX_LENGTH) return [];
      if (seenSkillNames.has(name.toLowerCase())) return [];
      seenSkillNames.add(name.toLowerCase());
      return [name];
    })
    .slice(0, MAX_TAGS_PER_CANDIDATE);

  const summary = cleanText(profile.about);

  return {
    firstName,
    lastName,
    linkedinUrl: cleanText(profile.linkedinUrl) ?? requestedUrl,
    title: cleanText(profile.headline),
    summary: summary ? truncate(summary, SUMMARY_MAX_LENGTH) : null,
    cityName: extractCityName(profile.location),
    experiences,
    formations,
    languages,
    skills,
  };
};

/** Élément du dataset Apify → brouillon ; null si le profil est inexploitable. */
const mapWith =
  (schema: z.ZodType<NormalizedProfile, unknown>) =>
  (rawProfile: unknown, requestedUrl: string): LinkedInProfileDraft | null => {
    const parsed = schema.safeParse(rawProfile);
    return parsed.success ? buildDraft(parsed.data, requestedUrl) : null;
  };

export const mapSupremeCoderProfile = mapWith(supremeCoderProfileSchema);
export const mapHarvestApiProfile = mapWith(harvestApiProfileSchema);

/**
 * Identifiant public d'un profil (« jean-dupont » dans linkedin.com/in/jean-dupont/),
 * en minuscules, pour comparer deux URL indépendamment du format.
 */
export const getLinkedInPublicIdentifier = (url: string): string | null => {
  const match = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
};

/**
 * Contrôle de cohérence d'un brouillon obtenu sur un profil de référence
 * (vérification quotidienne de l'acteur Apify). Liste vide → retour conforme.
 */
export const findDraftProblems = (draft: LinkedInProfileDraft | null): string[] => {
  if (!draft) return ["aucun profil exploitable dans la réponse Apify"];
  const problems: string[] = [];
  if (!draft.title) problems.push("titre (headline) absent");
  if (draft.experiences.length === 0) problems.push("aucune expérience exploitable");
  if (draft.formations.length === 0) problems.push("aucune formation exploitable");
  return problems;
};
