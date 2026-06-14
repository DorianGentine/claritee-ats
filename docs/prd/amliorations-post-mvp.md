# Améliorations Post MVP

Les points ci-dessous sont hors périmètre du MVP mais documentés pour les évolutions futures.

## Historique de recherche (style Notion)

- **Affichage de l’historique de recherche dans la modal de recherche globale**  
  Inspiré de Notion : dans la grande modal de recherche (ancrée en haut de l'écran à 20vh), afficher les recherches récentes (ex. « 30 derniers jours », « Plus ancien ») lorsque l’utilisateur n’a pas encore saisi de requête ou lorsqu’il n’y a pas de résultats.  
  *Prérequis :* persister les recherches par utilisateur/cabinet (table `SearchHistory` ou similaire), API pour récupérer l’historique, affichage dans la modal avant les résultats live.

## Villes structurées (table City + API Photon) — ✅ Epic 5

- **Remplacement des champs ville/localisation texte par une table City et des relations structurées**  
  Actuellement : `Candidate.city` et `JobOffer.location` sont des champs texte libres. Évolution vers une table `City` globale (name, region, country, latitude, longitude), des tables de liaison (`CandidateCity` avec ordre + drag & drop, `ClientCompanyCity` N–N sans ordre), et `JobOffer.cityId` pour une seule ville.  
  *API externe :* Photon (Komoot), gratuite, pas de clé, Europe, français, adaptée à l'autocomplétion.  
  *Flux :* recherche locale en base (seed 200–300 villes) puis fallback API Photon ; création à la volée des villes non référencées.  
  *Prérequis :* migration Prisma (suppression city/location, création City + liaisons), seed initial, procédure tRPC `city.autocomplete`, refonte filtres candidats (`cityIds`), refonte formulaires candidat/offre/client.  
  *Détail :* ADR 0005.

## Rôles et permissions

- **Restriction de la page Settings/Team aux admins du cabinet**  
  Actuellement, tous les utilisateurs d’un cabinet peuvent accéder à `/settings/team` et gérer les invitations.  
  *Amélioration envisagée :* restreindre cette page et les actions d’invitation (créer, révoquer, lister) aux administrateurs du cabinet.  
  *Prérequis :* ajout d’un champ de rôle dans le modèle `User` (ex. `role: "ADMIN" | "MEMBER"` ou `isAdmin: Boolean`), migration Prisma, procédure `adminProcedure` pour les procédures concernées.

---
