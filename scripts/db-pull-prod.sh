#!/usr/bin/env bash
#
# db-pull-prod.sh — Récupère les DONNÉES de production (Supabase cloud) vers la base LOCALE.
#
# Ce que fait le script :
#   1. Lit l'URL directe de prod depuis .env.prod.local (DIRECT_DATABASE_URL).
#   2. S'assure que le schéma local est à jour (prisma migrate deploy).
#   3. Dump data-only du schéma `public` de la prod (hors _prisma_migrations).
#   4. Dump des comptes auth de prod (auth.users + auth.identities).
#   5. Vide les tables `public` + les comptes auth locaux, puis recharge le tout.
#
# → Après ce pull, tu peux te connecter en local avec tes VRAIS identifiants de prod
#   (les mots de passe hashés sont copiés depuis auth.users).
#
# ⚠️  ÉCRASE les données locales (schéma public + comptes auth). Demande confirmation.
# ⚠️  Copie des données sensibles (emails, hash de mots de passe) en local. Reste local :
#     la base locale n'est jamais exposée et n'est pas versionnée.
#
# Usage : pnpm db:pull:prod
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROD_ENV_FILE=".env.prod.local"
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [[ ! -f "$PROD_ENV_FILE" ]]; then
  echo "❌ $PROD_ENV_FILE introuvable (identifiants prod)."
  exit 1
fi

# Charge DIRECT_DATABASE_URL de prod sans polluer l'environnement courant.
PROD_DB_URL="$(grep -E '^DIRECT_DATABASE_URL=' "$PROD_ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
if [[ -z "${PROD_DB_URL:-}" ]]; then
  echo "❌ DIRECT_DATABASE_URL absent de $PROD_ENV_FILE."
  exit 1
fi

# Garde-fou : la cible DOIT être locale.
if [[ "$LOCAL_DB_URL" != *"127.0.0.1"* && "$LOCAL_DB_URL" != *"localhost"* ]]; then
  echo "❌ La base cible n'est pas locale ($LOCAL_DB_URL). Abandon par sécurité."
  exit 1
fi

echo "🔻 Récupération des données PROD → LOCAL (public + comptes auth)"
echo "   Source (prod) : ${PROD_DB_URL%%@*}@[...]"
echo "   Cible (local) : $LOCAL_DB_URL"
echo ""
echo "⚠️  Cela ÉCRASE les données locales (schéma public + comptes auth)."
read -r -p "Continuer ? [y/N] " confirm
case "$confirm" in
  [yY]) ;;
  *) echo "Annulé." ; exit 0 ;;
esac

PUBLIC_DUMP="$(mktemp -t prod-public.XXXXXX.sql)"
AUTH_DUMP="$(mktemp -t prod-auth.XXXXXX.sql)"
trap 'rm -f "$PUBLIC_DUMP" "$AUTH_DUMP"' EXIT

echo "→ Mise à jour du schéma local (prisma migrate deploy)…"
pnpm exec prisma migrate deploy >/dev/null

# NB : pas de --disable-triggers. Il exige superuser (désactive aussi les triggers
# système de contrôle FK), or le rôle `postgres` local ne l'est pas. On bypasse plutôt
# les FK au chargement via `SET session_replication_role = replica` (cf. plus bas).
echo "→ Dump des données de prod (schéma public, data-only)…"
pg_dump "$PROD_DB_URL" \
  --data-only \
  --schema=public \
  --exclude-table='public._prisma_migrations' \
  --no-owner \
  --no-privileges \
  -f "$PUBLIC_DUMP"

echo "→ Dump des comptes auth de prod (auth.users + auth.identities)…"
pg_dump "$PROD_DB_URL" \
  --data-only \
  --table='auth.users' \
  --table='auth.identities' \
  --no-owner \
  --no-privileges \
  -f "$AUTH_DUMP"

echo "→ Purge des données locales (public + comptes auth)…"
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
DECLARE
  stmt text;
BEGIN
  SELECT string_agg(format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE', schemaname, tablename), '; ')
    INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END $$;
-- Comptes auth : CASCADE nettoie identities, sessions, refresh_tokens, etc.
TRUNCATE TABLE auth.users CASCADE;
SQL

# `session_replication_role = replica` désactive l'application des FK/triggers pour la
# session → chargement insensible à l'ordre. Le -c et le -f partagent la même session psql.
echo "→ Chargement des comptes auth de prod…"
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -q -c "SET session_replication_role = replica;" -f "$AUTH_DUMP"

echo "→ Chargement des données public de prod…"
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -q -c "SET session_replication_role = replica;" -f "$PUBLIC_DUMP"

echo ""
echo "✅ Données de prod récupérées en local (tu peux te connecter avec tes identifiants de prod)."
