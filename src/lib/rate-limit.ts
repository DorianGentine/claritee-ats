/**
 * Rate limiting pour Claritee ATS.
 * Implémentation in-memory, utilisable en dev et en production (limite par instance).
 *
 * Référence : docs/architecture.md § Rate limiting
 */
import { TRPCError } from "@trpc/server";

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitStore = {
  check: (key: string, limit: number, windowMs: number) => Promise<RateLimitResult>;
};

/** Entrée par clé : nombre de requêtes dans la fenêtre + fin de fenêtre (timestamp) */
const entries = new Map<
  string,
  { count: number; windowEndMs: number }
>();

/**
 * Rate limiter in-memory (dev et prod). En prod Vercel, la limite est par instance.
 */
const inMemoryStore: RateLimitStore = {
  check: async (key: string, limit: number, windowMs: number): Promise<RateLimitResult> => {
    const now = Date.now();
    const entry = entries.get(key);

    if (!entry) {
      entries.set(key, { count: 1, windowEndMs: now + windowMs });
      return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (now >= entry.windowEndMs) {
      entries.set(key, { count: 1, windowEndMs: now + windowMs });
      return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    entry.count += 1;
    if (entry.count > limit) {
      return { success: false, remaining: 0, resetAt: entry.windowEndMs };
    }
    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.windowEndMs,
    };
  },
};

/** Vide tous les compteurs. Réservé aux tests (isolation entre tests). */
export const resetRateLimits = (): void => {
  entries.clear();
};

/** Seuils recommandés (docs/architecture.md § Rate limiting) */
export const RATE_LIMITS = {
  /** Auth (login/register) par IP : 10 req / minute */
  AUTH_PER_IP: { limit: 10, windowMs: 60 * 1000 },
  /** Création de liens de partage par utilisateur : 20 / heure */
  SHARE_LINK_PER_USER: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Upload (photo + CV) par utilisateur : 30 / heure */
  UPLOAD_PER_USER: { limit: 30, windowMs: 60 * 60 * 1000 },
  /** Téléchargement CV par token de partage : 30 req / minute par IP */
  CV_DOWNLOAD_SHARE_PER_IP: { limit: 30, windowMs: 60 * 1000 },
  /** Import LinkedIn (appel Apify payant) par utilisateur : 20 / heure */
  LINKEDIN_IMPORT_PER_USER: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Autocomplétion de villes par utilisateur (appel Photon + écriture dans `cities`) : 60 / minute */
  CITY_AUTOCOMPLETE_PER_USER: { limit: 60, windowMs: 60 * 1000 },
  /** Mutations par utilisateur (toutes les mutations protégées, cf. `protectedProcedure`) : 60 / minute */
  GENERAL_MUTATION: { limit: 60, windowMs: 60 * 1000 },
} as const;

export const RATE_LIMIT_MESSAGE =
  "Trop de requêtes. Réessayez dans quelques minutes.";

/** IP du client (premier élément de `x-forwarded-for`, sinon `x-real-ip`). */
export const getClientIp = (headers: Headers | null | undefined): string =>
  headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headers?.get("x-real-ip") ||
  "unknown";

/**
 * Vérifie la limite pour une clé ; si dépassée, retourne success: false.
 * À appeler avant d’exécuter l’action (ex. dans une procédure tRPC ou un middleware).
 */
export const checkRateLimit = async (
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> => inMemoryStore.check(key, limit, windowMs);

/**
 * Comme `checkRateLimit`, mais lance une TRPCError TOO_MANY_REQUESTS si la
 * limite est dépassée.
 */
export const enforceRateLimit = async (
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<void> => {
  const result = await checkRateLimit(key, limit, windowMs);
  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: RATE_LIMIT_MESSAGE,
    });
  }
};

/**
 * Limite GENERAL_MUTATION d'un utilisateur authentifié, appliquée à toutes les
 * mutations par le middleware de `protectedProcedure`.
 * Clé : `mutation:${userId}` — partagée par toutes les mutations.
 */
export const checkMutationRateLimit = (userId: string): Promise<void> =>
  enforceRateLimit(`mutation:${userId}`, RATE_LIMITS.GENERAL_MUTATION);
