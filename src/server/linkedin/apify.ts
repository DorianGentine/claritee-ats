/**
 * Client Apify pour l'import LinkedIn : lance l'acteur de façon synchrone et
 * convertit le premier élément du dataset en brouillon de fiche.
 *
 * Variables d'env :
 *   APIFY_TOKEN           → requis ; sans lui l'import est désactivé
 *   APIFY_LINKEDIN_ACTOR  → optionnel, l'un des acteurs de LINKEDIN_ACTORS
 *                           (défaut supreme_coder~linkedin-profile-scraper)
 *
 * Pas d'import serveur (db, Next) : utilisé aussi par scripts/check-linkedin-import.ts.
 */
import {
  mapHarvestApiProfile,
  mapSupremeCoderProfile,
  type LinkedInProfileDraft,
} from "../../lib/linkedin/profile";

type LinkedInActor = {
  /** Input JSON de l'acteur pour une URL de profil */
  buildInput: (linkedinUrl: string) => Record<string, unknown>;
  /** Élément du dataset → brouillon (null si inexploitable) */
  mapProfile: (rawProfile: unknown, requestedUrl: string) => LinkedInProfileDraft | null;
};

/**
 * Acteurs gérés, interchangeables via APIFY_LINKEDIN_ACTOR. Un nouvel acteur
 * demande son schéma de sortie dans src/lib/linkedin/profile.ts.
 */
export const LINKEDIN_ACTORS: Record<string, LinkedInActor> = {
  // ~5 $ / 1 000 profils, pas de plafond de runs en plan gratuit
  "supreme_coder~linkedin-profile-scraper": {
    buildInput: (linkedinUrl) => ({
      urls: [{ url: linkedinUrl }],
      scrapeCompany: false,
      findContacts: false,
    }),
    mapProfile: mapSupremeCoderProfile,
  },
  // ~4 $ / 1 000 profils, mais 50 runs au total en plan Apify gratuit
  "harvestapi~linkedin-profile-scraper": {
    buildInput: (linkedinUrl) => ({
      profileScraperMode: "Profile details no email ($4 per 1k)",
      urls: [linkedinUrl],
    }),
    mapProfile: mapHarvestApiProfile,
  },
};

export const DEFAULT_LINKEDIN_ACTOR = "supreme_coder~linkedin-profile-scraper";

/** Un run prend ~10-60 s ; au-delà, on abandonne */
const APIFY_RUN_TIMEOUT_SECONDS = 120;

export type LinkedInImportErrorCode =
  | "NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "PROFILE_NOT_FOUND"
  | "TIMEOUT";

export class LinkedInImportError extends Error {
  constructor(
    readonly code: LinkedInImportErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LinkedInImportError";
  }
}

export const isLinkedInImportConfigured = (): boolean =>
  Boolean(process.env.APIFY_TOKEN?.trim());

/** Acteur configuré, au format « owner~name » (« owner/name » est accepté). */
export const getLinkedInActorId = (): string =>
  (process.env.APIFY_LINKEDIN_ACTOR?.trim() || DEFAULT_LINKEDIN_ACTOR).replace(
    "/",
    "~"
  );

export type LinkedInImportResult = {
  rawProfile: unknown;
  draft: LinkedInProfileDraft | null;
};

/** Lance l'acteur sur une URL de profil et convertit le premier élément du dataset. */
export const fetchLinkedInProfile = async (
  linkedinUrl: string
): Promise<LinkedInImportResult> => {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    throw new LinkedInImportError(
      "NOT_CONFIGURED",
      "APIFY_TOKEN n'est pas défini"
    );
  }

  const actorId = getLinkedInActorId();
  const actor = LINKEDIN_ACTORS[actorId];
  if (!actor) {
    throw new LinkedInImportError(
      "NOT_CONFIGURED",
      `Acteur Apify non géré : ${actorId} (gérés : ${Object.keys(LINKEDIN_ACTORS).join(", ")})`
    );
  }

  const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=${APIFY_RUN_TIMEOUT_SECONDS}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actor.buildInput(linkedinUrl)),
      // Marge au-dessus du timeout du run côté Apify
      signal: AbortSignal.timeout((APIFY_RUN_TIMEOUT_SECONDS + 15) * 1000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new LinkedInImportError("TIMEOUT", "Apify n'a pas répondu à temps");
    }
    throw new LinkedInImportError(
      "PROVIDER_ERROR",
      `Appel Apify impossible : ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (response.status === 408) {
    throw new LinkedInImportError("TIMEOUT", "Le run Apify a dépassé le délai");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LinkedInImportError(
      "PROVIDER_ERROR",
      `Apify a répondu HTTP ${response.status} : ${body.slice(0, 500)}`
    );
  }

  const items: unknown = await response.json();
  if (!Array.isArray(items) || items.length === 0) {
    throw new LinkedInImportError(
      "PROFILE_NOT_FOUND",
      "Le dataset Apify est vide"
    );
  }
  const rawProfile: unknown = items[0];
  return { rawProfile, draft: actor.mapProfile(rawProfile, linkedinUrl) };
};
