# Auth — Envoi de l’email de confirmation d’inscription

> Récapitulatif des essais et solution retenue pour l’envoi du mail de confirmation lors de l’inscription (flux 100 % côté serveur).

---

## Contexte

- **Inscription** : flux serveur uniquement (tRPC `auth.register`).
- **Création du compte Auth** : `supabase.auth.admin.createUser()` avec `email_confirm: false` pour que l’utilisateur doive confirmer son email avant de se connecter.
- **Objectif** : après création de l’utilisateur, envoyer l’email de confirmation en utilisant le **SMTP configuré dans le dashboard Supabase** (pas de service tiers type Resend/SendGrid, pas de duplication de config SMTP dans l’app).

---

## Essais effectués

### 1. `admin.createUser` seul (sans étape supplémentaire)

- **Idée** : avec `email_confirm: false`, Supabase enverrait peut‑être automatiquement l’email.
- **Résultat** : **aucun email envoyé**. Avec l’API Admin, Supabase ne déclenche jamais l’envoi d’email : le SMTP du dashboard n’est pas utilisé pour les utilisateurs créés via `admin.createUser`.

### 2. `admin.createUser` + `auth.resend()` (première tentative)

- **Idée** : après création, appeler `supabaseAdmin.auth.resend({ type: 'signup', email })` pour déclencher l’envoi via le SMTP Supabase.
- **Résultat** : selon l’environnement / la config, ça n’a pas fonctionné dans un premier temps (SMTP custom pas encore correctement configuré ou autre cause). **Après réglage (SMTP OVH dans le dashboard Supabase), cette approche a fini par fonctionner** et a été retenue.

### 3. `generateLink` + envoi manuel (nodemailer)

- **Idée** : `admin.generateLink({ type: 'signup', email, password })` pour obtenir l’URL de confirmation, puis envoi de l’email depuis notre backend avec **nodemailer** et des variables d’environnement SMTP (même config qu’OVH).
- **Résultat** : **fonctionne**, mais :
  - duplication de la config SMTP (dashboard Supabase + `.env`),
  - dépendance nodemailer + maintenance du template HTML côté app.
- **Intérêt** : solution de repli si `resend` ne fonctionne pas (réseau, config Supabase, etc.).

### 4. Inscription côté client (`signUp`)

- **Idée** : utiliser `supabase.auth.signUp()` côté client pour que Supabase envoie lui‑même l’email via son SMTP ; créer Company + User au premier login (ensureUserProfile) depuis les métadonnées.
- **Résultat** : **techniquement viable**, mais on quitte le flux 100 % serveur (logique d’inscription et de création Company/User répartie entre client et serveur). Non retenu pour garder la cohérence “tout côté serveur”.

---

## Solution retenue

**`admin.createUser` + `auth.resend`** :

1. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { … } })`.
2. Immédiatement après : `supabaseAdmin.auth.resend({ type: 'signup', email: input.email })`.
3. Supabase envoie l’email de confirmation via le **SMTP configuré dans le dashboard** (Auth → SMTP).
4. Création Company + User en base (transaction Prisma) comme avant.

**Avantages** :

- Un seul endroit pour le SMTP (dashboard Supabase).
- Pas de nodemailer ni de variables SMTP dans l’app.
- Flux d’inscription entièrement côté serveur.
- Template d’email géré dans Supabase (Auth → Email templates → Confirm signup).

**Prérequis** :

- SMTP personnalisé configuré dans **Supabase Dashboard → Authentication → SMTP**.
- **Auth → Providers → Email** : option “Confirm email” activée.
- **Auth → URL Configuration** : Site URL et Redirect URLs corrects (ex. `https://ton-domaine.fr/login`, `http://localhost:3000/**` en dev).

---

## Code actuel (extrait)

```ts
// src/server/trpc/routers/auth.ts

const { data: authUser, error: createAuthError } =
  await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: { firstName, lastName, companyName, siren },
  });

if (createAuthError || !authUser?.user) {
  /* throw CONFLICT */
}

const { error: resendError } = await supabaseAdmin.auth.resend({
  type: "signup",
  email: input.email,
});
if (resendError) {
  console.warn(
    "[auth.register] Resend confirmation email failed:",
    resendError.message
  );
}

// Puis transaction Prisma (Company + User)…
```

---

## En cas de problème avec `resend`

Si l’email ne part pas (config Supabase, rate limit, etc.) :

1. Vérifier les **Auth logs** (Dashboard → Logs → Auth) pour d’éventuelles erreurs sur l’envoi.
2. Vérifier **Auth → SMTP** (identifiants, port, “Enable custom SMTP”).
3. **Repli** : réactiver l’envoi via **generateLink + nodemailer** (module `src/lib/email/send-confirmation.ts`, variables `SMTP_*` dans `.env`), comme lors des essais §3.

---

_Dernière mise à jour : 2026-02-16._
