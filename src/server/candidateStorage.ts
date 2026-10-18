import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fichiers d'un candidat dans Supabase Storage :
 * `{companyId}/candidates/{candidateId}/{photo|cv}.{ext}`, une extension par format accepté.
 */
const CANDIDATE_FILES = {
  photos: { name: "photo", extensions: ["jpg", "png", "webp"] },
  cvs: { name: "cv", extensions: ["pdf", "doc", "docx"] },
} as const;

export type CandidateBucket = keyof typeof CANDIDATE_FILES;

export const CANDIDATE_BUCKETS = Object.keys(
  CANDIDATE_FILES
) as CandidateBucket[];

export const getCandidateFilePath = (
  companyId: string,
  candidateId: string,
  bucket: CandidateBucket,
  extension: string
): string =>
  `${companyId}/candidates/${candidateId}/${CANDIDATE_FILES[bucket].name}.${extension}`;

/** Dérive l'extension du CV stocké depuis le nom d'origine (`pdf` par défaut). */
export const getCvStorageExt = (cvFileName: string | null): string => {
  const extension = cvFileName?.split(".").pop()?.toLowerCase() ?? "";
  return (CANDIDATE_FILES.cvs.extensions as readonly string[]).includes(
    extension
  )
    ? extension
    : "pdf";
};

/**
 * Supprime le fichier du candidat dans le bucket, toutes extensions confondues
 * sauf `keepExtension` (le fichier qui vient d'être uploadé).
 * Supprimer un chemin absent n'est pas une erreur côté Supabase.
 */
export const removeCandidateFile = async (
  supabase: SupabaseClient,
  companyId: string,
  candidateId: string,
  bucket: CandidateBucket,
  keepExtension?: string
) => {
  const paths = CANDIDATE_FILES[bucket].extensions
    .filter((extension) => extension !== keepExtension)
    .map((extension) =>
      getCandidateFilePath(companyId, candidateId, bucket, extension)
    );
  const { error } = await supabase.storage.from(bucket).remove(paths);
  return error;
};

export type StoredCandidate = {
  id: string;
  companyId: string;
  photoUrl: string | null;
  cvUrl: string | null;
  cvFileName: string | null;
};

export type StorageFileStatus =
  | { status: "current"; path: string }
  | { status: "orphan"; path: string; reason: string }
  | { status: "unexpected"; path: string };

/**
 * Classe un fichier du bucket par rapport à la base :
 * - `current` : fichier référencé par son candidat ;
 * - `orphan` : candidat supprimé, autre cabinet, ou fichier remplacé / retiré ;
 * - `unexpected` : chemin hors convention, à examiner à la main (jamais supprimé).
 */
export const classifyCandidateFile = (
  bucket: CandidateBucket,
  path: string,
  candidatesById: Map<string, StoredCandidate>
): StorageFileStatus => {
  const match = path.match(
    /^([^/]+)\/candidates\/([^/]+)\/([^/.]+)\.([^/.]+)$/
  );
  const [, companyId, candidateId, name, extension] = match ?? [];
  const { name: expectedName, extensions } = CANDIDATE_FILES[bucket];
  if (
    !match ||
    name !== expectedName ||
    !(extensions as readonly string[]).includes(extension)
  ) {
    return { status: "unexpected", path };
  }

  const candidate = candidatesById.get(candidateId);
  if (!candidate) {
    return { status: "orphan", path, reason: "candidat supprimé" };
  }
  if (candidate.companyId !== companyId) {
    return { status: "orphan", path, reason: "candidat d'un autre cabinet" };
  }

  // L'URL stockée contient le vrai chemin ; `cvFileName` peut porter une autre extension
  // que le fichier (nom d'origine sans extension ou différente du type MIME).
  const referencedUrl =
    bucket === "photos" ? candidate.photoUrl : candidate.cvUrl;
  const isCurrent = referencedUrl?.endsWith(`/${path}`) ?? false;
  return isCurrent
    ? { status: "current", path }
    : { status: "orphan", path, reason: "fichier remplacé ou retiré" };
};
