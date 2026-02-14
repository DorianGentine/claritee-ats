-- Claritee ATS - Row Level Security (RLS) Policies
-- Appliqué automatiquement via Prisma migrate (après la migration du schéma).
-- Référence : docs/architecture/rls-policies.sql

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

-- ============ COMPANY ============

CREATE POLICY "company_select_own" ON "Company"
  FOR SELECT USING (
    id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "company_update_own" ON "Company"
  FOR UPDATE USING (
    id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

-- ============ USER ============

CREATE POLICY "user_select_same_company" ON "User"
  FOR SELECT USING (
    "companyId" = (SELECT "companyId" FROM "User" WHERE id = auth.uid())
  );

CREATE POLICY "user_update_self" ON "User"
  FOR UPDATE USING (id = auth.uid());

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
