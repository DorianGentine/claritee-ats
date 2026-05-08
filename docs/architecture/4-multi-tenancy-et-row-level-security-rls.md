# 4. Multi-tenancy et Row Level Security (RLS)

## 4.1 Principe

- **Tenant = Company (cabinet).** Chaque table métier (hors `Company`, `User`, `Invitation` gérées avec des règles dédiées) possède une colonne `companyId` (FK vers `Company`).
- **Isolation :** les politiques RLS sur Supabase garantissent qu’une requête ne voit que les lignes du cabinet de l’utilisateur connecté.

## 4.2 Règle d’accès au tenant

- L’utilisateur connecté est identifié par `auth.uid()` (Supabase).
- Le `companyId` de l’utilisateur est obtenu via la table `User` : `company_id = (SELECT company_id FROM public.user WHERE id = auth.uid())`.

## 4.3 Politiques RLS (appliquées via Prisma)

Elles sont appliquées automatiquement à chaque `prisma migrate deploy` ou `prisma migrate reset`. Aucune action manuelle dans le dashboard Supabase n’est nécessaire (voir `prisma/migrations/20300101000000_add_rls_policies/migration.sql`).

**Activation RLS sur les tables concernées :**

```sql
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientCompany" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareLink" ENABLE ROW LEVEL SECURITY;
-- Tables enfants (Experience, Formation, etc.) : accès via FK vers entités déjà protégées
-- selon besoin : soit RLS sur table enfant avec companyId dérivé, soit accès uniquement via JOIN avec Candidate/JobOffer
```

**Exemple : table `Candidate` (SELECT, INSERT, UPDATE, DELETE par cabinet) :**

```sql
-- Policy: user can only see candidates of their company
CREATE POLICY "candidate_select" ON "Candidate"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "candidate_insert" ON "Candidate"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "candidate_update" ON "Candidate"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "candidate_delete" ON "Candidate"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );
```

**Table `User` :** un utilisateur ne voit que les utilisateurs de sa company :

```sql
CREATE POLICY "user_select" ON "User"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );
-- INSERT/UPDATE : gérés par l'app (inscription, invitation) avec service role ou via API tRPC après vérification
```

**Table `Company` :** lecture pour les utilisateurs de la company ; mise à jour restreinte (ex. admin ou même company) :

```sql
CREATE POLICY "company_select" ON "Company"
  FOR SELECT USING (
    id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );
```

**Tables sans `companyId` direct (ex. `Experience`, `Formation`, `Language`)**  
- Option 1 : pas de RLS sur ces tables ; l’accès est uniquement via Prisma/tRPC qui filtre toujours par `Candidate` (lui-même filtré par `companyId`).  
- Option 2 : politiques RLS basées sur une sous-requête vers `Candidate` / `JobOffer` pour vérifier le `companyId`. Pour le MVP, l’option 1 (contrôle côté app) est acceptable si toutes les requêtes passent par des procédures qui vérifient le cabinet.

**Résumé des tables avec `companyId` et RLS recommandé :**

- `Company`, `User`, `Invitation` : policies dédiées (lecture company, lecture users/invitations du cabinet).
- `Candidate`, `Tag`, `ClientCompany`, `JobOffer`, `Note`, `ShareLink` : policies SELECT/INSERT/UPDATE/DELETE sur `companyId = (SELECT "companyId" FROM "User" WHERE id = auth.uid())`.
- Tables de liaison (`CandidateTag`, `OfferTag`, `Candidature`) et tables enfants (`Experience`, `Formation`, `Language`, `ClientContact`) : soit RLS dérivé du parent, soit contrôle strict côté application.

Le fichier `docs/architecture/rls-policies.sql` reste la référence documentée ; la version exécutée est celle dans `prisma/migrations/20300101000000_add_rls_policies/migration.sql`.

---
