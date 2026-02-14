-- Claritee ATS - Row Level Security (RLS) Policies
-- Référence / documentation. L'application réelle se fait via Prisma :
-- prisma/migrations/20300101000000_add_rls_policies/migration.sql
-- (appliqué automatiquement par prisma migrate deploy / migrate reset)
-- Les noms de tables et colonnes suivent le schéma Prisma (PascalCase)

-- Helper: récupérer le companyId de l'utilisateur connecté
-- On suppose que auth.uid() correspond à User.id

-- ============ ACTIVATION RLS ============

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientCompany" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareLink" ENABLE ROW LEVEL SECURITY;

-- Tables sans companyId direct : Experience, Formation, Language, ClientContact,
-- CandidateTag, OfferTag, Candidature — accès contrôlé côté app via Candidate/JobOffer/ClientCompany.
-- Pour renforcer la défense en profondeur, on peut ajouter des policies basées sur les parents.

-- ============ COMPANY ============
-- Lecture : uniquement sa propre company

CREATE POLICY "company_select_own" ON "Company"
  FOR SELECT USING (
    id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "company_update_own" ON "Company"
  FOR UPDATE USING (
    id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- INSERT Company : fait par l'app lors de l'inscription (avec service role ou bypass RLS temporaire)
-- En production, utiliser une fonction ou une API avec service role pour la création initiale.

-- ============ USER ============
-- Les utilisateurs d'un cabinet voient les autres membres du même cabinet

CREATE POLICY "user_select_same_company" ON "User"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "user_update_self" ON "User"
  FOR UPDATE USING (id = auth.uid());

-- INSERT User : géré par l'app (inscription, acceptation invitation) avec service role ou fonction sécurisée.

-- ============ INVITATION ============

CREATE POLICY "invitation_select" ON "Invitation"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "invitation_insert" ON "Invitation"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "invitation_update" ON "Invitation"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "invitation_delete" ON "Invitation"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- ============ CANDIDATE ============

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

-- ============ TAG ============

CREATE POLICY "tag_select" ON "Tag"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "tag_insert" ON "Tag"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "tag_update" ON "Tag"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "tag_delete" ON "Tag"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- ============ CLIENT COMPANY ============

CREATE POLICY "client_company_select" ON "ClientCompany"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "client_company_insert" ON "ClientCompany"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "client_company_update" ON "ClientCompany"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "client_company_delete" ON "ClientCompany"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- ============ JOB OFFER ============

CREATE POLICY "job_offer_select" ON "JobOffer"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "job_offer_insert" ON "JobOffer"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "job_offer_update" ON "JobOffer"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "job_offer_delete" ON "JobOffer"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- ============ NOTE ============

CREATE POLICY "note_select" ON "Note"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "note_insert" ON "Note"
  FOR INSERT WITH CHECK (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    AND "authorId" = auth.uid()
  );

CREATE POLICY "note_update" ON "Note"
  FOR UPDATE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    AND "authorId" = auth.uid()
  );

CREATE POLICY "note_delete" ON "Note"
  FOR DELETE USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    AND "authorId" = auth.uid()
  );

-- ============ SHARE LINK ============
-- Lecture par token : doit être possible sans auth pour la page publique /share/[token]
-- On utilise une policy SELECT qui autorise soit le cabinet du candidat, soit tout le monde
-- pour les lignes dont le token est connu (vérification faite dans l'app par token).
-- En pratique : page publique lit ShareLink par token via une API tRPC publique ou route API
-- qui ne s'appuie pas sur auth.uid(). Donc soit :
-- A) Lecture ShareLink sans RLS pour SELECT (risqué) — déconseillé
-- B) Lecture via service role dans l'endpoint public (recommandé)
-- C) Policy SELECT qui autorise true pour ShareLink (tout le monde peut lire toute ligne)
--
-- Recommandation : endpoint public utilise le client Supabase avec service role ou une
-- requête Prisma directe (bypass RLS si Prisma utilise la connection string avec role
-- qui bypass RLS). Sinon, policy SELECT permissive pour ShareLink uniquement pour
-- les lignes où expiresAt > now() OU expiresAt IS NULL (à exprimer en SQL).
--
-- Ici : policy restrictive pour les utilisateurs authentifiés (même cabinet que le candidat).
-- Pour la page publique : utiliser une route API dédiée qui lit par token avec
-- prisma.$queryRaw ou Supabase service role, sans passer par le contexte auth user.

CREATE POLICY "share_link_select_company" ON "ShareLink"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Candidate" c
      WHERE c.id = "ShareLink"."candidateId"
        AND c."companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    )
  );

CREATE POLICY "share_link_insert" ON "ShareLink"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Candidate" c
      WHERE c.id = "ShareLink"."candidateId"
        AND c."companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    )
  );

CREATE POLICY "share_link_delete" ON "ShareLink"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Candidate" c
      WHERE c.id = "ShareLink"."candidateId"
        AND c."companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    )
  );

-- Note : La lecture de ShareLink par token pour la page publique /share/[token]
-- doit être faite côté serveur via une API qui utilise soit le service role Supabase,
-- soit une connexion Prisma avec un rôle qui bypass RLS pour cette requête ciblée,
-- afin de ne pas exposer toutes les lignes ShareLink.
