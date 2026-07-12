#!/usr/bin/env bash
#
# test-db.sh — Lance les tests dépendants de la base sur une base de test DÉDIÉE.
#
# Pourquoi une base dédiée ?
#   - Les tests d'intégration ne s'isolent pas entre eux → ils exigent une base
#     fraîche à chaque run pour être déterministes.
#   - On ne veut PAS écraser la base de dev (`postgres`) à chaque `pnpm test:db`.
#   → On (re)crée `claritee_test` à neuf sur la même instance Postgres locale.
#
# Fonctionne à l'identique en local et en CI (instance fournie par `supabase start`).
# Args supplémentaires transmis à vitest (ex: `pnpm test:db -t "city"`).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HOST_PORT="${TEST_DB_HOST_PORT:-127.0.0.1:54322}"
ADMIN_URL="postgresql://postgres:postgres@${HOST_PORT}/postgres"
TEST_DB="${TEST_DB_NAME:-claritee_test}"
TEST_URL="postgresql://postgres:postgres@${HOST_PORT}/${TEST_DB}"

echo "→ (Re)création de la base de test '${TEST_DB}'…"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE);" \
  -c "CREATE DATABASE ${TEST_DB};"

# Stub auth.uid() : fourni par Supabase sur la base `postgres`, absent d'une base
# neuve. Les tests se connectent en owner (bypass RLS) → un stub renvoyant NULL suffit
# pour que la migration RLS s'applique.
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q \
  -c "CREATE SCHEMA IF NOT EXISTS auth;" \
  -c "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$ SELECT NULL::uuid \$\$ LANGUAGE sql;"

echo "→ Application des migrations sur '${TEST_DB}'…"
DATABASE_URL="$TEST_URL" DIRECT_DATABASE_URL="$TEST_URL" pnpm exec prisma migrate deploy

echo "→ Tests db (série) sur '${TEST_DB}'…"
DATABASE_URL="$TEST_URL" DIRECT_DATABASE_URL="$TEST_URL" \
  pnpm exec vitest run --config vitest.config.db.ts src/__tests__/db "$@"
