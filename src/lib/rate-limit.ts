/**
 * Rate limiting pour Claritee ATS.
 * Implémentation in-memory, utilisable en dev et en production (limite par instance).
 *
 * Référence : docs/architecture.md §10.6 et docs/architecture/rate-limiting.md
 */

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

/** Seuils recommandés (architecture §10.6) */
export const RATE_LIMITS = {
  /** Auth (login/register) par IP : 10 req / minute */
  AUTH_PER_IP: { limit: 10, windowMs: 60 * 1000 },
  /** Création de liens de partage par utilisateur : 20 / heure */
  SHARE_LINK_PER_USER: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Upload (photo + CV) par utilisateur : 30 / heure */
  UPLOAD_PER_USER: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * Vérifie la limite pour une clé ; si dépassée, retourne success: false.
 * À appeler avant d’exécuter l’action (ex. dans une procédure tRPC ou un middleware).
 */
export const checkRateLimit = async (
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> => inMemoryStore.check(key, limit, windowMs);
