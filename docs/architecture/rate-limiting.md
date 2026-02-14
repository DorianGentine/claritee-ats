# Rate limiting — Intégration

Référence cible : `docs/architecture.md` §10.6. Ce document décrit où et comment brancher le rate limiting pour respecter les seuils et rester dans les quotas free tier.

---

## 1. Seuils cibles

| Périmètre | Clé | Limite | Fenêtre |
|----------|-----|--------|---------|
| Auth (login / register) | IP | 10 req | 1 minute |
| Création de liens de partage | userId | 20 req | 1 heure |
| Upload (photo + CV) | userId | 30 req | 1 heure |

En cas de dépassement : répondre **HTTP 429** ou erreur tRPC équivalente, message client générique : « Trop de requêtes. Réessayez dans quelques minutes. »

---

## 2. Implémentation fournie

- **Fichier** : `src/lib/rate-limit.ts`
- **Comportement** : store **in-memory** par défaut, utilisable en dev comme en production. En prod, la limite s'applique par instance (non partagée entre les fonctions serverless).

Exports utiles :

```ts
import { checkRateLimit, RATE_LIMITS, type RateLimitResult } from "@/lib/rate-limit";
```

---

## 3. Où brancher le rate limiting

### 3.1 Auth (par IP)

**Contexte** : limiter les tentatives de connexion / inscription par IP (brute-force, inscriptions abusives).

**Option A — Middleware Next.js**  
Dans `src/middleware.ts`, pour les requêtes vers les routes d'auth (ex. `/login`, `/register`, `/invite/*`) :

1. Récupérer l'IP : `request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"`.
2. Clé : `auth:${ip}`.
3. Appeler `checkRateLimit(key, RATE_LIMITS.AUTH_PER_IP.limit, RATE_LIMITS.AUTH_PER_IP.windowMs)`.
4. Si `success === false`, retourner `NextResponse.json({ error: "Too Many Requests" }, { status: 429 })`.

**Option B — Route API / tRPC**  
Si l'inscription (création Company + User) passe par une procédure tRPC (ex. `auth.register`), ajouter en tête de la procédure :

- Récupérer l'IP depuis les headers du contexte tRPC.
- `checkRateLimit("auth:" + ip, ...)`.
- Si dépassé : `throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de requêtes. Réessayez dans quelques minutes." })`.

La connexion (login) étant gérée par Supabase côté client, Supabase applique déjà des limites ; le rate limit par IP peut cibler uniquement la route/procédure d'inscription si besoin.

### 3.2 Création de liens de partage (par utilisateur)

**Contexte** : procédure `shareLink.create` (normale ou anonyme).

Dans le router `shareLink`, avant de créer le lien :

```ts
// Dans shareLink.create (protectedProcedure)
const userId = ctx.user.id;
const result = await checkRateLimit(
  `share:${userId}`,
  RATE_LIMITS.SHARE_LINK_PER_USER.limit,
  RATE_LIMITS.SHARE_LINK_PER_USER.windowMs
);
if (!result.success) {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Trop de requêtes. Réessayez dans quelques minutes.",
  });
}
```

### 3.3 Upload (photo / CV) (par utilisateur)

**Contexte** : upload vers Supabase Storage déclenché depuis une mutation tRPC (ex. `candidate.uploadPhoto`, `candidate.uploadCv`) ou une route API qui reçoit le fichier.

Dans la procédure ou la route qui traite l'upload :

```ts
const userId = ctx.user.id;
const result = await checkRateLimit(
  `upload:${userId}`,
  RATE_LIMITS.UPLOAD_PER_USER.limit,
  RATE_LIMITS.UPLOAD_PER_USER.windowMs
);
if (!result.success) {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Trop de requêtes. Réessayez dans quelques minutes.",
  });
}
```

---

## 4. Résumé

| Zone | Clé | Fichier / endroit |
|------|-----|-------------------|
| Auth (IP) | `auth:${ip}` | Middleware Next.js ou procédure `auth.register` |
| Partage | `share:${userId}` | Router `shareLink`, procédure `create` |
| Upload | `upload:${userId}` | Procédures ou route qui traitent l'upload photo/CV |

Code commun : `src/lib/rate-limit.ts` + ce guide. En prod, le store in-memory est utilisé (limite par instance).
