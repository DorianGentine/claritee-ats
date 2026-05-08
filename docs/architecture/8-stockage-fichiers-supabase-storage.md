# 8. Stockage fichiers (Supabase Storage)

## 8.1 Buckets

- **`photos`** : photos candidats (JPG, PNG, WebP ; max 2 Mo). Bucket **public** ; URLs directes utilisables.
- **`cvs`** : CV (PDF, DOC, DOCX ; max 5 Mo). Bucket **privé** ; accès via URLs signées à la demande (cf. §8.5).

## 8.2 Structure par company

- Chemins recommandés :
  - Photos : `{companyId}/candidates/{candidateId}/photo.{ext}`
  - CVs : `{companyId}/candidates/{candidateId}/cv.{ext}`

Cela permet des policies Storage par `companyId` (prefix) et évite les collisions.

## 8.3 Policies Storage (concept)

- **Bucket photos** (public) : policies SELECT publiques ou par chemin selon besoin.
- **Bucket cvs** (privé) : policies SELECT restreintes (utilisateur authentifié + `companyId` dans le chemin). L'API utilise le service role pour upload/suppression ; le téléchargement passe par des URLs signées générées côté serveur.

Les policies Supabase Storage se définissent par bucket et par opération (SELECT, INSERT, DELETE) en fonction du chemin et du `company_id` de l’utilisateur (récupéré via la table `User`).

## 8.4 URLs en base

- `Candidate.photoUrl` : URL publique Supabase (après upload) ; lien direct utilisable.
- `Candidate.cvUrl` : URL de référence stockée (générée par `getPublicUrl` à l'upload). Avec un bucket privé, cette URL ne permet pas l'accès direct ; le téléchargement réel passe par les procédures d'URLs signées (§8.5).

## 8.5 Téléchargement des CVs (bucket privé)

Les CVs sont des données personnelles sensibles. L'approche retenue est un **bucket privé** avec **URLs signées** à la demande :

- **Upload / suppression** : via `uploadCv` et `deleteCv` (service role ; contourne les policies Storage).
- **Téléchargement** : au clic de l'utilisateur, l'app appelle `getCvDownloadUrl` (fiche candidat authentifiée) ou `getCvDownloadUrlByShareToken` (page partagée publique) ; la procédure génère une URL signée (durée de vie 15 min) et la retourne au client.
- **Cache client** : le hook `useCvDownloadUrl` met en cache l'URL signée 14 min pour limiter les appels répétés.
- **Contexte page partagée** : la procédure `getCvDownloadUrlByShareToken` valide le token et l'expiration du ShareLink ; rate limit 30 req/min par IP.
- **Configuration** : voir `docs/supabase-cvs-bucket-config-prompt.md` pour la création et les policies du bucket `cvs`.

---
