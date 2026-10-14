#!/usr/bin/env bash
#
# vercel-build.sh — Commande de build Vercel (appelée par vercel.json).
#
# 1. `next build` d'abord : un build en échec ne touche jamais la base.
# 2. `prisma migrate deploy` ensuite, en production uniquement : les previews ne
#    migrent jamais la base. Une migration en échec fait échouer le déploiement.
#
# Garde-fous : VERCEL_ENV absent → échec (sinon la migration serait sautée sans bruit) ;
# DIRECT_DATABASE_URL absente en production → échec (sinon Prisma se rabat sur
# DATABASE_URL, le pooler en mode transaction, incompatible avec migrate deploy).
set -euo pipefail

if [ -z "${VERCEL_ENV:-}" ]; then
  echo "VERCEL_ENV absent : impossible de savoir s'il faut migrer, build interrompu." >&2
  exit 1
fi

if [ "$VERCEL_ENV" = "production" ] && [ -z "${DIRECT_DATABASE_URL:-}" ]; then
  echo "DIRECT_DATABASE_URL absente en production : migration impossible, build interrompu." >&2
  exit 1
fi

pnpm build

if [ "$VERCEL_ENV" = "production" ]; then
  echo "→ Migrations (VERCEL_ENV=production)"
  pnpm exec prisma migrate deploy
else
  echo "→ Migrations ignorées (VERCEL_ENV=$VERCEL_ENV)"
fi
