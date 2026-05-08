# 7. Auth : Supabase Auth + tRPC + Next.js

## 7.1 Flux

1. **Inscription :** formulaire → tRPC `auth.register` → `admin.createUser` (email non confirmé) → `auth.resend({ type: 'signup', email })` (envoi email via SMTP Supabase) → création `Company` + `User` en transaction. Détail des essais et solution : [architecture/auth-email-confirmation.md](architecture/auth-email-confirmation.md).
2. **Connexion :** email/mot de passe → Supabase Auth `signInWithPassword` → session JWT (cookie ou stockage côté client selon config Supabase).
3. **Requêtes tRPC :** le contexte tRPC lit la session (Supabase `getUser` côté serveur) et résout `userId` + `companyId` (via table `User`). Les procédures `protected` exigent une session valide et injectent `companyId`.
4. **Middleware Next.js :** sur les routes `(dashboard)/**`, vérification de la session ; si absente, redirection vers `/login`. La route `/share/[token]` reste publique.

## 7.2 Contexte tRPC (résumé)

```ts
// src/server/trpc/context.ts (conceptuel)
export const createContext = async (opts: { headers: Headers }) => {
  const supabase = createServerClient(opts.headers);
  const { data: { user } } = await supabase.auth.getUser();
  const companyId = user ? await getCompanyIdFromUserId(user.id) : null;
  return { user, companyId, db: prisma };
};

// Procédure protégée : throw si !ctx.companyId
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, companyId: ctx.companyId } });
});
```

Toutes les mutations/queries métier (candidats, offres, clients, notes, partages) utilisent `protectedProcedure` et filtrent par `ctx.companyId`.

## 7.2.1 Session côté client (Navbar, état auth)

Pour les composants client qui doivent afficher l'état de connexion (ex. `SiteNavbar`), on utilise `getSession()` plutôt que `getUser()`. Choix documenté : `getSession()` lit la session depuis le stockage local/cookies sans appel réseau, ce qui permet un affichage immédiat au chargement. `getUser()` valide le JWT auprès du serveur et est réservé au contexte serveur (tRPC, proxy). En cas de session invalide ou expirée, `onAuthStateChange` mettra à jour l'état après le prochain refresh ou une action utilisateur.

## 7.3 Invitation

- Création d’une entrée `Invitation` (email, token, companyId, expiresAt).
- L’utilisateur ouvre `/invite/[token]` ; la page pré-remplit l’email et appelle Supabase `signUp` ; après succès, création du `User` avec `companyId` de l’invitation, puis marquage de l’invitation comme utilisée.

---
