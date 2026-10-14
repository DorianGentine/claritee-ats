-- Claritee ATS - Fermeture de l'API REST Supabase (Data API) sur le schéma public.
--
-- L'app n'accède aux tables public que via Prisma (rôle propriétaire, non concerné) ;
-- le Storage passe par le client admin (service_role). Les rôles anon / authenticated
-- n'ont donc besoin d'aucun droit. Or les projets Supabase anciens leur accordent tout
-- par défaut : les tables sans RLS (CandidateCity, ClientCompanyCity, cities) étaient
-- lisibles et modifiables avec la clé publique.

-- ============ DROITS ACTUELS ============

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- ============ OBJETS FUTURS ============
-- Les tables, séquences et fonctions créées par les prochaines migrations (rôle postgres)
-- ne seront plus exposées. EXECUTE est accordé à PUBLIC par défaut : une fonction
-- SECURITY DEFINER serait sinon appelable via /rest/v1/rpc avec la clé publishable.
-- Hors de portée de postgres : les objets de supabase_admin (fonctions des extensions
-- pg_trgm / unaccent, fonctions de texte sans accès aux données).

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
-- Le EXECUTE à PUBLIC est un défaut intégré : seule une révocation globale (sans IN SCHEMA) le retire.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============ RLS PARTOUT (défense en profondeur) ============
-- Sans policy, la RLS refuse tout accès aux rôles non propriétaires.

ALTER TABLE "CandidateCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientCompanyCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experience" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Language" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
