/**
 * check-linkedin-import.ts — Vérifie que l'acteur Apify de l'import LinkedIn
 * fonctionne toujours : import d'un profil public de référence, puis contrôle
 * du brouillon obtenu (identité, titre, expériences, formations).
 *
 * Usage :
 *   bun run linkedin:check                     # .env.local (APIFY_TOKEN requis)
 *   LINKEDIN_CHECK_PROFILE_URL=… bun run linkedin:check
 *
 * Code de sortie 1 si le service est cassé : le workflow
 * .github/workflows/linkedin-import-check.yml prévient alors l'admin par email.
 * Chaque exécution consomme un run Apify.
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { findDraftProblems } from "../src/lib/linkedin/profile";
import {
  fetchLinkedInProfile,
  getLinkedInActorId,
} from "../src/server/linkedin/apify";

/** Profil public, stable et complet (expériences + formations datées) */
const DEFAULT_REFERENCE_PROFILE_URL = "https://www.linkedin.com/in/williamhgates/";

const main = async () => {
  if (existsSync(".env.local")) {
    config({ path: ".env.local", quiet: true });
  }

  const profileUrl =
    process.env.LINKEDIN_CHECK_PROFILE_URL?.trim() || DEFAULT_REFERENCE_PROFILE_URL;
  console.warn(`Acteur : ${getLinkedInActorId()}`);
  console.warn(`Profil de référence : ${profileUrl}`);

  const startedAt = Date.now();
  const { rawProfile, draft } = await fetchLinkedInProfile(profileUrl);
  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

  const problems = findDraftProblems(draft);
  if (problems.length > 0) {
    console.error(`ÉCHEC (${durationSeconds} s) :`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("Réponse brute (tronquée) :");
    console.error(JSON.stringify(rawProfile, null, 2).slice(0, 2000));
    process.exit(1);
  }

  console.warn(
    `OK (${durationSeconds} s) : ${draft!.firstName} ${draft!.lastName}, ` +
      `${draft!.experiences.length} expérience(s), ${draft!.formations.length} formation(s), ` +
      `${draft!.languages.length} langue(s).`
  );
};

main().catch((error: unknown) => {
  console.error("ÉCHEC :", error instanceof Error ? error.message : error);
  process.exit(1);
});
