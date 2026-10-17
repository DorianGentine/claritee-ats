-- Claritee ATS - Suppression des policies RLS (code mort).
--
-- L'app n'accède aux tables que via Prisma (rôle propriétaire, qui ignore la RLS) et la
-- Data API Supabase est fermée (20300102000000_revoke_data_api_access) : ces policies ne
-- s'appliquaient à aucun accès réel. Elles étaient en outre cassées (récursion infinie :
-- la policy de "User" relisait "User").
--
-- La RLS reste activée sur toutes les tables : sans policy, elle refuse tout aux rôles
-- non propriétaires (défense en profondeur avec la révocation des droits).
-- Pour rouvrir un jour la Data API : réécrire des policies via une fonction
-- SECURITY DEFINER renvoyant le companyId courant (voir docs/architecture.md §4).

DROP POLICY IF EXISTS "company_select_own" ON "Company";
DROP POLICY IF EXISTS "company_update_own" ON "Company";
DROP POLICY IF EXISTS "user_select_same_company" ON "User";
DROP POLICY IF EXISTS "user_update_self" ON "User";
DROP POLICY IF EXISTS "invitation_select" ON "Invitation";
DROP POLICY IF EXISTS "invitation_insert" ON "Invitation";
DROP POLICY IF EXISTS "invitation_update" ON "Invitation";
DROP POLICY IF EXISTS "invitation_delete" ON "Invitation";
DROP POLICY IF EXISTS "candidate_select" ON "Candidate";
DROP POLICY IF EXISTS "candidate_insert" ON "Candidate";
DROP POLICY IF EXISTS "candidate_update" ON "Candidate";
DROP POLICY IF EXISTS "candidate_delete" ON "Candidate";
DROP POLICY IF EXISTS "tag_select" ON "Tag";
DROP POLICY IF EXISTS "tag_insert" ON "Tag";
DROP POLICY IF EXISTS "tag_update" ON "Tag";
DROP POLICY IF EXISTS "tag_delete" ON "Tag";
DROP POLICY IF EXISTS "client_company_select" ON "ClientCompany";
DROP POLICY IF EXISTS "client_company_insert" ON "ClientCompany";
DROP POLICY IF EXISTS "client_company_update" ON "ClientCompany";
DROP POLICY IF EXISTS "client_company_delete" ON "ClientCompany";
DROP POLICY IF EXISTS "job_offer_select" ON "JobOffer";
DROP POLICY IF EXISTS "job_offer_insert" ON "JobOffer";
DROP POLICY IF EXISTS "job_offer_update" ON "JobOffer";
DROP POLICY IF EXISTS "job_offer_delete" ON "JobOffer";
DROP POLICY IF EXISTS "note_select" ON "Note";
DROP POLICY IF EXISTS "note_insert" ON "Note";
DROP POLICY IF EXISTS "note_update" ON "Note";
DROP POLICY IF EXISTS "note_delete" ON "Note";
DROP POLICY IF EXISTS "share_link_select_company" ON "ShareLink";
DROP POLICY IF EXISTS "share_link_insert" ON "ShareLink";
DROP POLICY IF EXISTS "share_link_delete" ON "ShareLink";
