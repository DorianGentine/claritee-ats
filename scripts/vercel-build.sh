#!/usr/bin/env bash
#
# vercel-build.sh — Commande de build Vercel (appelée par vercel.json).
#
# 1. `next build` d'abord : un build en échec ne touche jamais la base.
# 2. `prisma migrate deploy` ensuite, en production uniquement : les previews ne
#    migrent jamais la base. Une migration en échec fait échouer le déploiement.
#
# Garde-fous : VERCEL_ENV absent → échec (sinon la migration serait sautée sans bruit) ;
# DIRECT_DATABASE_URL absente ou mal ciblée en production → échec avant le build
# (sinon Prisma se rabat sur DATABASE_URL, pooler transaction, ou vise l'hôte direct
# IPv6 injoignable : P1001 après un build de plusieurs minutes).
set -euo pipefail

if [ -z "${VERCEL_ENV:-}" ]; then
  echo "VERCEL_ENV absent : impossible de savoir s'il faut migrer, build interrompu." >&2
  exit 1
fi

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "${DIRECT_DATABASE_URL:-}" ]; then
    echo "DIRECT_DATABASE_URL absente en production : migration impossible, build interrompu." >&2
    exit 1
  fi
  # Comparaison insensible à la casse (tr : compatible bash 3.2).
  database_url="$(printf '%s' "$DIRECT_DATABASE_URL" | tr '[:upper:]' '[:lower:]')"
  # Hôte direct db.<ref>.supabase.co : IPv6 uniquement (le projet n'a pas l'option IPv4
  # payante de Supabase), injoignable depuis le build Vercel (IPv4).
  # Port 6543 : pooler en mode transaction, incompatible avec prisma migrate.
  # Attendu : pooler en mode session, …pooler.supabase.com:5432.
  if [[ "$database_url" =~ @db\.[^.]+\.supabase\.co ]] || [[ "$database_url" =~ :6543([/?]|$) ]]; then
    echo "DIRECT_DATABASE_URL doit viser le pooler Supabase en mode session (…pooler.supabase.com:5432)," >&2
    echo "pas la connexion directe (IPv6 seulement) ni le pooler transaction (6543). Build interrompu." >&2
    exit 1
  fi
  # Le pooler identifie le projet par l'utilisateur : <rôle>.<ref> (ex. postgres.<ref>), sinon P1000.
  if [[ "$database_url" =~ pooler\.supabase\.com ]] && ! [[ "$database_url" =~ ://[^:@/]+\.[^:@/]+[:@] ]]; then
    echo "DIRECT_DATABASE_URL : avec le pooler Supabase, l'utilisateur doit être <rôle>.<ref> (ex. postgres.<ref>)." >&2
    echo "Build interrompu." >&2
    exit 1
  fi
  # pgbouncer est réservé au pooler transaction (DATABASE_URL) : à retirer en mode session.
  if [[ "$database_url" =~ pgbouncer= ]]; then
    echo "DIRECT_DATABASE_URL : retirer ?pgbouncer=… (réservé au pooler transaction). Build interrompu." >&2
    exit 1
  fi
fi

bun run build

if [ "$VERCEL_ENV" = "production" ]; then
  echo "→ Migrations (VERCEL_ENV=production)"
  bun run prisma migrate deploy
else
  echo "→ Migrations ignorées (VERCEL_ENV=$VERCEL_ENV)"
fi
