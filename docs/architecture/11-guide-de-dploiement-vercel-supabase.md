# 11. Guide de déploiement (Vercel + Supabase)

## 11.1 Prérequis

- Compte Vercel, compte Supabase.
- Node.js 18+ en local.

## 11.2 Supabase

1. Créer un projet Supabase (région EU pour RGPD).
2. Récupérer dans **API Keys** : l'**URL** du projet, la **Publishable key** (client) et la **Secret key** (serveur uniquement) (à n’utiliser que côté serveur, ne jamais exposer la clé secrète au client).
3. Dans Settings → Database : copier la **connection string** PostgreSQL (mode "Transaction" pour Prisma) → `DATABASE_URL`.
4. Exécuter les migrations Prisma : `npx prisma migrate deploy` (inclut automatiquement l’application des politiques RLS).
6. Créer les buckets Storage `photos` et `cvs` et configurer les policies.
7. Auth : laisser les paramètres par défaut (email/password) ; configurer l’URL de redirection (site URL + redirect URLs) vers le domaine Vercel.

## 11.3 Vercel

1. Importer le repo Git (GitHub/GitLab) dans Vercel.
2. Framework Preset : Next.js.
3. Variables d’environnement à définir :
   - `DATABASE_URL` (connection string Prisma)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clé publique, ex-client)
   - `SUPABASE_SECRET_KEY` (clé secrète, serveur uniquement ; ex. opérations admin, lecture ShareLink publique)
4. Build : `npm run build` (ou `pnpm build`).
5. Déploiement : chaque push sur la branche principale peut déclencher un déploiement automatique.

## 11.4 Post-déploiement

- Vérifier `/api/health` (200 OK).
- Tester inscription → création company + user → accès dashboard.
- Tester création candidat, upload photo/CV, génération lien partage, page `/share/[token]`.

## 11.5 Limites free tier (rappel)

- Supabase : 500 Mo DB, 1 Go Storage, 50 000 MAU.
- Vercel : 100 Go bandwidth/mois, 100 GB-hrs serverless.
- Surveiller l’usage (Supabase Dashboard, Vercel Analytics) pour rester sous les seuils.

## 11.6 Backup et restauration (free tier)

En free tier, pas de backup automatique garanti par Supabase ; la responsabilité des sauvegardes incombe au projet.

- **Base de données :** utiliser les **exports manuels** depuis le dashboard Supabase (Settings → Database → Export ou outil `pg_dump` avec la connection string). Fréquence recommandée : au moins **hebdomadaire** avant des changements importants (migrations, déploiement majeur), ou après une grosse saisie. Stocker les exports dans un espace sécurisé (ex. stockage local ou cloud perso), sans les committer dans le repo.
- **Storage (photos, CV) :** Supabase ne propose pas d’export bulk simple en free tier. Pour une sauvegarde complète : lister les objets des buckets `photos` et `cvs` (API ou dashboard) et les télécharger manuellement ou via un script ponctuel. En cas de perte, les URLs en base (`Candidate.photoUrl`, `Candidate.cvUrl`) deviendront invalides ; prévoir une gestion des fichiers manquants côté UI (placeholder ou message).
- **Restauration :** réimporter un dump SQL dans un projet Supabase (nouveau ou existant) via l’éditeur SQL ou `psql`. Les migrations Prisma restent la source de vérité du schéma ; en cas de restauration sur une base vide, exécuter `prisma migrate deploy` puis importer les données du dump si besoin. Pour le code applicatif : le repo Git + déploiement Vercel suffisent ; pas de backup spécifique du code hors versioning.

Référence Supabase : [Backups and restores](https://supabase.com/docs/guides/platform/backups) (documentation officielle, selon l’offre).

## 11.7 Backup — chiffrement et audit trail (si audits)

Si le projet devient soumis à des audits (ISO 27001, SOC2, audits clients, etc.), les attentes suivantes s'appliquent :

- **Stockage des exports** : les dumps DB et fichiers exportés doivent être stockés sur un support chiffré (chiffrement at rest). Exemples : volume chiffré local, bucket cloud avec chiffrement (S3, GCS, etc.), archive compressée et chiffrée (gpg) avant stockage.
- **Traçabilité des accès sensibles** : les opérations d'export et de suppression définitive doivent être tracées (qui, quand, type d'action, identifiant concerné si pertinent). Voir §10.4 « Traçabilité et responsabilité » ; en contexte d'audit, un journal dédié (table `AuditLog` ou équivalent) peut remplacer les seuls logs stdout.
- **Périmètre** : pas d'obligation pour le MVP ; documenter ces attentes pour faciliter la montée en conformité si nécessaire.

## 11.8 Améliorations possibles

- **Recherche full-text (tsvector)** : l'implémentation actuelle utilise Prisma `OR` + `contains`/`ilike` sur les champs candidats et offres. Une variante avec **PostgreSQL tsvector** (colonnes GIN indexées, `to_tsvector`/`to_tsquery`) offrirait de meilleures performances et une pertinence renforcée sur de gros volumes, au prix d'une complexité accrue (colonnes dédiées, triggers de mise à jour, migration). Voir `docs/architecture/adr/0004-recherche-tsvector-vs-ilike.md` pour le raisonnement détaillé.

---
