-- DropIndex
-- Idempotent : l'index n'existe que sur la prod (créé hors-migration via l'ADR 0005).
-- Sur une base fraîche (local/CI) il est absent → IF EXISTS évite l'échec du bootstrap.
DROP INDEX IF EXISTS "idx_cities_name_trgm";
