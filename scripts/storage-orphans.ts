/**
 * storage-orphans.ts — Repère (et supprime avec --apply) les fichiers des buckets
 * `photos` et `cvs` qui ne correspondent plus à aucun candidat en base.
 *
 * Usage :
 *   bun run storage:orphans                                  # rapport, base locale (.env.local)
 *   bun run storage:orphans --env-file .env.prod.local       # rapport, prod
 *   bun run storage:orphans --env-file .env.prod.local --apply
 *
 * Sans --apply, rien n'est supprimé. Avec --apply, confirmation demandée.
 * Les chemins hors convention sont listés mais jamais supprimés.
 */
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  CANDIDATE_BUCKETS,
  classifyCandidateFile,
  type CandidateBucket,
  type StorageFileStatus,
  type StoredCandidate,
} from "../src/server/candidateStorage";

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

const parseArgs = (argv: string[]) => {
  const envFileIndex = argv.indexOf("--env-file");
  const envFile = envFileIndex >= 0 ? argv[envFileIndex + 1] : ".env.local";
  if (!envFile || envFile.startsWith("--")) {
    throw new Error("--env-file attend un chemin de fichier");
  }
  return { envFile, apply: argv.includes("--apply") };
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant`);
  }
  return value;
};

/** Liste récursivement les fichiers d'un bucket (les dossiers ont un `id` nul). */
const listFiles = async (
  supabase: SupabaseClient,
  bucket: CandidateBucket,
  prefix = ""
): Promise<string[]> => {
  const files: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset });
    if (error) {
      throw new Error(
        `Listing ${bucket}/${prefix} impossible : ${error.message}`
      );
    }
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listFiles(supabase, bucket, path)));
      } else if (entry.name !== ".emptyFolderPlaceholder") {
        files.push(path);
      }
    }
    if (data.length < LIST_PAGE_SIZE) {
      return files;
    }
  }
};

const confirm = async (question: string): Promise<boolean> => {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await readline.question(question);
  readline.close();
  return answer.trim().toLowerCase() === "oui";
};

const main = async () => {
  const { envFile, apply } = parseArgs(process.argv.slice(2));
  if (!existsSync(envFile)) {
    throw new Error(`Fichier d'environnement introuvable : ${envFile}`);
  }
  // override : sans lui, une variable déjà présente (shell, .env chargé par bun run)
  // l'emporte et le Storage d'une cible peut être confronté à la base d'une autre.
  config({ path: envFile, override: true, quiet: true });

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(
    supabaseUrl,
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false },
    }
  );
  const databaseUrl = requireEnv("DATABASE_URL");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  const target = `Storage ${new URL(supabaseUrl).host}, base ${new URL(databaseUrl).host}`;
  console.warn(`→ Cible : ${target} (${envFile})`);

  try {
    const filesByBucket = new Map<CandidateBucket, string[]>();
    for (const bucket of CANDIDATE_BUCKETS) {
      // `list` sur un bucket absent renvoie une liste vide, pas une erreur.
      const { error } = await supabase.storage.getBucket(bucket);
      if (error) {
        throw new Error(`Bucket ${bucket} introuvable : ${error.message}`);
      }
      filesByBucket.set(bucket, await listFiles(supabase, bucket));
    }

    const candidates: StoredCandidate[] = await db.candidate.findMany({
      select: {
        id: true,
        companyId: true,
        photoUrl: true,
        cvUrl: true,
        cvFileName: true,
      },
    });
    const candidatesById = new Map(
      candidates.map((candidate) => [candidate.id, candidate])
    );

    const orphansByBucket = new Map<CandidateBucket, string[]>();
    for (const [bucket, paths] of filesByBucket) {
      const results: StorageFileStatus[] = paths.map((path) =>
        classifyCandidateFile(bucket, path, candidatesById)
      );
      const orphans = results.flatMap((result) =>
        result.status === "orphan" ? [result] : []
      );
      const unexpected = results.filter(
        (result) => result.status === "unexpected"
      );

      console.warn(
        `\n[${bucket}] ${paths.length} fichier(s), ${orphans.length} orphelin(s), ${unexpected.length} hors convention`
      );
      for (const orphan of orphans) {
        console.warn(`  orphelin    ${orphan.path} (${orphan.reason})`);
      }
      for (const result of unexpected) {
        console.warn(`  à examiner  ${result.path}`);
      }
      orphansByBucket.set(
        bucket,
        orphans.map((orphan) => orphan.path)
      );
    }

    const orphanCount = [...orphansByBucket.values()].reduce(
      (total, paths) => total + paths.length,
      0
    );
    if (orphanCount === 0) {
      console.warn("\nAucun fichier orphelin.");
      return;
    }
    if (!apply) {
      console.warn(
        `\n${orphanCount} fichier(s) orphelin(s). Relancer avec --apply pour les supprimer.`
      );
      return;
    }
    if (
      !(await confirm(
        `\nSupprimer ${orphanCount} fichier(s) (${target}) ? Taper "oui" : `
      ))
    ) {
      console.warn("Annulé.");
      return;
    }

    for (const [bucket, paths] of orphansByBucket) {
      for (let start = 0; start < paths.length; start += REMOVE_BATCH_SIZE) {
        const batch = paths.slice(start, start + REMOVE_BATCH_SIZE);
        const { error } = await supabase.storage.from(bucket).remove(batch);
        if (error) {
          throw new Error(
            `Suppression dans ${bucket} échouée : ${error.message}`
          );
        }
      }
    }
    console.warn(`${orphanCount} fichier(s) supprimé(s).`);
  } finally {
    await db.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
