#!/usr/bin/env bash
#
# check-local-services.sh — Vérifie que Supabase local (Docker) répond avant `next dev`.
#
# Objectif : remplacer le `TypeError: fetch failed / ECONNREFUSED` (peu clair, répété
# en boucle par Next.js à chaque requête) par un message direct si Supabase local n'est
# pas démarré.
#
# Ne fait rien si NEXT_PUBLIC_SUPABASE_URL ne pointe pas vers une instance locale
# (ex: .env.local pointant vers un environnement distant).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.local"
[[ -f "$ENV_FILE" ]] || ENV_FILE=".env"
[[ -f "$ENV_FILE" ]] || exit 0

SUPABASE_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')" || true
[[ -z "$SUPABASE_URL" ]] && exit 0

# On ne vérifie que les instances locales (127.0.0.1 / localhost) : si l'env pointe
# vers un serveur distant, on laisse Next.js gérer les erreurs réseau normalement.
# Ancré sur le host (schéma + host + port/chemin optionnel) pour ne pas confondre
# une simple sous-chaîne "localhost" ailleurs dans l'URL avec une instance locale.
if [[ ! "$SUPABASE_URL" =~ ^https?://(127\.0\.0\.1|localhost)(:[0-9]+)?(/|$) ]]; then
  exit 0
fi

# Pas de --fail : on ne teste que la joignabilité TCP/HTTP, pas le code de statut.
# Le gateway Kong de Supabase local répond 404 sur la racine par design (routage
# par chemin, pas de route "/") même quand la stack est parfaitement saine —
# vérifié en conditions réelles (`docker ps` : tous les conteneurs "healthy").
# Avec --fail, ce 404 légitime ferait échouer le check à chaque `pnpm dev`.
if ! curl -s -o /dev/null --max-time 1 "$SUPABASE_URL"; then
  echo ""
  echo "❌ Supabase local ne répond pas sur $SUPABASE_URL"
  echo ""
  echo "   → Vérifie que Docker Desktop est lancé, puis démarre la stack :"
  echo "     pnpm db:local:start"
  echo ""
  exit 1
fi
