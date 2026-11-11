/**
 * configure-storage-buckets.ts — Crée ou met à jour les buckets `photos` et `cvs`
 * avec leur visibilité, leur taille max et leurs types MIME acceptés.
 *
 * Les fichiers partent du navigateur directement vers Storage (URL signée) :
 * ces limites font refuser un fichier trop gros par Storage lui-même, avant la
 * revérification serveur de `candidate.confirmFileUpload`.
 *
 * Usage (idempotent) :
 *   bun run storage:configure                             # stack locale (.env.local)
 *   bun run storage:configure --env-file .env.prod.local  # prod
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  CV_ACCEPTED_MIMES,
  CV_MAX_BYTES,
  PHOTO_ACCEPTED_MIMES,
  PHOTO_MAX_BYTES,
} from "../src/lib/validations/candidate";

const BUCKETS = [
  {
    id: "photos",
    public: true,
    fileSizeLimit: PHOTO_MAX_BYTES,
    allowedMimeTypes: [...PHOTO_ACCEPTED_MIMES],
  },
  {
    id: "cvs",
    public: false,
    fileSizeLimit: CV_MAX_BYTES,
    allowedMimeTypes: [...CV_ACCEPTED_MIMES],
  },
];

const parseEnvFile = (argv: string[]): string => {
  const envFileIndex = argv.indexOf("--env-file");
  const envFile = envFileIndex >= 0 ? argv[envFileIndex + 1] : ".env.local";
  if (!envFile || envFile.startsWith("--")) {
    throw new Error("--env-file attend un chemin de fichier");
  }
  return envFile;
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant`);
  }
  return value;
};

const main = async () => {
  const envFile = parseEnvFile(process.argv.slice(2));
  if (!existsSync(envFile)) {
    throw new Error(`Fichier d'environnement introuvable : ${envFile}`);
  }
  config({ path: envFile, override: true, quiet: true });

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(
    supabaseUrl,
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false },
    }
  );
  console.warn(`→ Cible : Storage ${new URL(supabaseUrl).host} (${envFile})`);

  for (const { id, ...options } of BUCKETS) {
    const { data: existing } = await supabase.storage.getBucket(id);
    const { error } = existing
      ? await supabase.storage.updateBucket(id, options)
      : await supabase.storage.createBucket(id, options);
    if (error) {
      throw new Error(`Bucket ${id} : ${error.message}`);
    }
    console.warn(
      `${existing ? "Mis à jour" : "Créé"} : ${id} (${options.public ? "public" : "privé"}, ${options.fileSizeLimit / 1024 / 1024} Mo max, ${options.allowedMimeTypes.join(", ")})`
    );
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
