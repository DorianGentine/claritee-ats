import { randomUUID } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fichiers d'un candidat dans Supabase Storage :
 * `{companyId}/candidates/{candidateId}/{photo|cv}-{uuid}.{ext}`, un nom unique par
 * upload. Les fichiers antérieurs, sans identifiant (`cv.pdf`), restent reconnus.
 */
const CANDIDATE_FILES = {
  photos: { name: "photo", extensions: ["jpg", "png", "webp"] },
  cvs: { name: "cv", extensions: ["pdf", "doc", "docx"] },
} as const

export type CandidateBucket = keyof typeof CANDIDATE_FILES

export const CANDIDATE_BUCKETS = Object.keys(
  CANDIDATE_FILES
) as CandidateBucket[]

const CANDIDATE_FILE_PATTERN =
  /^([^/]+)\/candidates\/([^/]+)\/([a-z]+)(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.([a-z]+)$/

/** Taille max d'un listing de dossier candidat (quelques fichiers en pratique). */
const FOLDER_LIST_LIMIT = 100

const getCandidateFolder = (companyId: string, candidateId: string): string =>
  `${companyId}/candidates/${candidateId}`

/** Nouveau chemin, unique, pour un upload. */
export const createCandidateFilePath = (
  companyId: string,
  candidateId: string,
  bucket: CandidateBucket,
  extension: string
): string =>
  `${getCandidateFolder(companyId, candidateId)}/${CANDIDATE_FILES[bucket].name}-${randomUUID()}.${extension}`

export type CandidateFilePath = {
  companyId: string
  candidateId: string
  extension: string
}

/** Décompose un chemin conforme à la convention du bucket, sinon `null`. */
export const parseCandidateFilePath = (
  bucket: CandidateBucket,
  path: string
): CandidateFilePath | null => {
  const match = CANDIDATE_FILE_PATTERN.exec(path)
  if (!match) return null
  const [, companyId, candidateId, name, extension] = match
  const { name: expectedName, extensions } = CANDIDATE_FILES[bucket]
  if (
    name !== expectedName ||
    !(extensions as readonly string[]).includes(extension)
  ) {
    return null
  }
  return { companyId, candidateId, extension }
}

/**
 * Chemin du fichier référencé par une URL stockée (`photoUrl`, `cvUrl`), s'il
 * appartient bien à ce candidat ; sinon `null`.
 */
export const getCandidateFilePathFromUrl = (
  bucket: CandidateBucket,
  companyId: string,
  candidateId: string,
  url: string | null
): string | null => {
  if (!url) return null
  const folderStart = url.indexOf(
    `/${getCandidateFolder(companyId, candidateId)}/`
  )
  if (folderStart < 0) return null
  const path = url.slice(folderStart + 1).split(/[?#]/)[0]
  const parsed = parseCandidateFilePath(bucket, path)
  return parsed?.companyId === companyId && parsed.candidateId === candidateId
    ? path
    : null
}

/**
 * Supprime les fichiers du candidat dans le bucket (ceux qui suivent la
 * convention), sauf `keepPath`. Retourne l'erreur Storage éventuelle.
 */
export const removeCandidateFiles = async (
  supabase: SupabaseClient,
  companyId: string,
  candidateId: string,
  bucket: CandidateBucket,
  keepPath?: string | null
) => {
  const folder = getCandidateFolder(companyId, candidateId)
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: FOLDER_LIST_LIMIT })
  if (listError) return listError

  const paths = (files ?? [])
    .map((file) => `${folder}/${file.name}`)
    .filter(
      (path) =>
        path !== keepPath && parseCandidateFilePath(bucket, path) !== null
    )
  if (paths.length === 0) return null

  const { error } = await supabase.storage.from(bucket).remove(paths)
  return error
}

/** Taille de page des listings Storage. */
const LIST_PAGE_SIZE = 1000

/** Liste récursivement les fichiers sous un préfixe (les dossiers ont un `id` nul). */
const listFilesUnder = async (
  supabase: SupabaseClient,
  bucket: CandidateBucket,
  prefix: string
): Promise<string[]> => {
  const files: string[] = []
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset })
    if (error) throw error
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) {
        files.push(...(await listFilesUnder(supabase, bucket, path)))
      } else {
        files.push(path)
      }
    }
    if ((data ?? []).length < LIST_PAGE_SIZE) return files
  }
}

/**
 * Supprime tous les fichiers du cabinet dans le bucket (préfixe `{companyId}/`),
 * y compris ceux hors convention. Retourne l'erreur Storage éventuelle.
 */
export const removeCompanyFiles = async (
  supabase: SupabaseClient,
  companyId: string,
  bucket: CandidateBucket
) => {
  try {
    const paths = await listFilesUnder(supabase, bucket, companyId)
    for (let start = 0; start < paths.length; start += LIST_PAGE_SIZE) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths.slice(start, start + LIST_PAGE_SIZE))
      if (error) return error
    }
    return null
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
}

export type StoredCandidate = {
  id: string
  companyId: string
  photoUrl: string | null
  cvUrl: string | null
  cvFileName: string | null
}

export type StorageFileStatus =
  | { status: "current"; path: string }
  | { status: "orphan"; path: string; reason: string }
  | { status: "unexpected"; path: string }

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
  const parsed = parseCandidateFilePath(bucket, path)
  if (!parsed) {
    return { status: "unexpected", path }
  }
  const { companyId, candidateId } = parsed

  const candidate = candidatesById.get(candidateId)
  if (!candidate) {
    return { status: "orphan", path, reason: "candidat supprimé" }
  }
  if (candidate.companyId !== companyId) {
    return { status: "orphan", path, reason: "candidat d'un autre cabinet" }
  }

  // L'URL stockée contient le vrai chemin ; `cvFileName` peut porter une autre extension
  // que le fichier (nom d'origine sans extension ou différente du type MIME).
  const referencedUrl =
    bucket === "photos" ? candidate.photoUrl : candidate.cvUrl
  const isCurrent = referencedUrl?.endsWith(`/${path}`) ?? false
  return isCurrent
    ? { status: "current", path }
    : {
        status: "orphan",
        path,
        reason: "fichier remplacé, retiré ou jamais confirmé",
      }
}
