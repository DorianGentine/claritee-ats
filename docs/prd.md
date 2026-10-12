# Claritee ATS — PRD

> Référence produit : pourquoi Claritee existe, ce qu'il doit faire et ce qui a été livré. Dernière mise à jour : 2026-10-12.

## 1. Vision & contexte

### Problème

Les petits cabinets de recrutement français gèrent candidats, offres et clients dans des outils éparpillés (Excel, emails, notes papier, LinkedIn). Conséquences : bons candidats oubliés, même candidat contacté deux fois par deux collègues, CV bruts envoyés aux clients. Les ATS du marché sont trop chers, trop complexes ou ignorent les usages français (SIREN, fiches anonymisées pour la prospection).

### Proposition

Un ATS web gratuit, simple et chaleureux qui centralise candidats, offres, clients et notes, et produit des fiches candidats partageables (complètes ou anonymisées) au rendu de CV professionnel.

### Utilisateurs cibles

| Segment                           | Profil                                                        | Besoins clés                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Recruteur (principal)             | Cabinet de 1 à 20 personnes en France, non technique, desktop | Retrouver vite un candidat, suivre son statut par offre, éviter les doublons de contact, envoyer des fiches propres, noter vite |
| Dirigeant du cabinet (secondaire) | Fondateur, souvent recruteur lui-même                         | Créer le compte en quelques minutes, inviter l'équipe, données isolées et sécurisées                                            |
| Client du cabinet (lecteur)       | Entreprise ou prospect, sans compte                           | Consulter une fiche partagée sans se connecter                                                                                  |

### Contraintes

| Contrainte                                          | Conséquence                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Développeur unique, projet personnel, sans échéance | Monolithe simple, pas de microservices, livraison itérative par épics            |
| Budget 0 €                                          | Uniquement les offres gratuites de Supabase (500 Mo DB, 1 Go stockage) et Vercel |
| Marché français                                     | Interface et messages en français, SIREN, hébergement UE                         |
| Pas de scraping LinkedIn (CGU)                      | Saisie manuelle, qui doit donc être rapide                                       |

### Indicateurs de succès

10 cabinets actifs à 3 mois, rétention J7 ≥ 80 %, au moins 5 candidats et 3 offres par cabinet actif. Les objectifs de temps côté utilisateur sont repris en NFR10 à NFR13.

## 2. Exigences

### Fonctionnelles

| ID           | Exigence                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1          | Inscription avec prénom, nom, email et mot de passe                                                                                                                |
| FR2          | Connexion et déconnexion sécurisées                                                                                                                                |
| FR3          | Création du cabinet à l'inscription (raison sociale + SIREN unique à 9 chiffres)                                                                                   |
| FR4          | Invitation de collaborateurs par URL dédiée, avec expiration et révocation ; tous les membres ont les mêmes droits (pas de rôles)                                  |
| FR5          | Fiche candidat : prénom, nom, email, téléphone, LinkedIn, photo, titre, résumé, villes, langues avec niveau                                                        |
| FR6          | Expériences professionnelles sur la fiche candidat (titre, entreprise, dates, description)                                                                         |
| FR7          | Formations sur la fiche candidat (intitulé, domaine, école, dates)                                                                                                 |
| FR8          | Dépôt, téléchargement et suppression d'un CV (fichier) par candidat                                                                                                |
| FR9          | Affichage de la fiche candidat en layout CV (en-tête + deux colonnes)                                                                                              |
| FR10 / FR13  | Tags libres sur candidats et offres, partagés au niveau du cabinet (20 max par élément)                                                                            |
| FR11         | Offre d'emploi : titre, description, ville, fourchette de salaire min/max                                                                                          |
| FR12         | Statut d'offre : « À faire », « En cours », « Terminé »                                                                                                            |
| FR14         | Entreprises clientes : raison sociale, SIREN facultatif, villes d'implantation                                                                                     |
| FR15         | Contacts clients : prénom, nom, email, téléphone, poste, LinkedIn                                                                                                  |
| FR16 / FR16b | Association facultative d'une offre à une entreprise cliente et à l'un de ses contacts                                                                             |
| FR17         | Candidature (candidat × offre, unique) avec statut : contacté sur LinkedIn, contact téléphonique, postulé, accepté, refusé par l'employeur, rejeté par le candidat |
| FR18 / FR19  | Notes partagées dans le cabinet, en éditeur riche, sur les candidats et sur les offres                                                                             |
| FR20         | Widget de note rapide, non bloquant, accessible depuis toutes les pages                                                                                            |
| FR21         | Notes libres et page « Mes notes » pour les organiser et les rattacher à un candidat ou une offre                                                                  |
| FR22 / FR23  | Recherche globale sur candidats (identité, titre, résumé, tags, expériences, formations, langues) et offres (titre, description)                                   |
| FR24 / FR25  | Filtres : candidats par tags, villes et langues ; offres par statut, salaire, ville, tags et client                                                                |
| FR26         | Lien de partage d'une fiche candidat en version complète                                                                                                           |
| FR27         | Lien de partage anonymisé (sans nom, photo, coordonnées, noms d'entreprises ni d'écoles)                                                                           |
| FR28         | Page publique de la fiche partagée, sans connexion, avec expiration (7 jours, 30 jours ou jamais)                                                                  |
| FR29         | Villes structurées et partagées, avec autocomplétion (référentiel local puis service de géocodage externe)                                                         |
| FR30         | Villes multiples et ordonnées (glisser-déposer) pour un candidat, multiples pour un client, unique pour une offre                                                  |
| FR31         | Tableau de bord : compteurs (candidats, offres en cours, clients) et activité récente                                                                              |
| FR32         | Paramètres : profil utilisateur, informations du cabinet, membres et invitations                                                                                   |

### Non fonctionnelles

| ID          | Exigence                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| NFR1        | Uniquement des services gratuits (Supabase, Vercel)                                            |
| NFR2        | Isolation stricte des données par cabinet (multi-tenant)                                       |
| NFR3        | Chargement initial < 3 s                                                                       |
| NFR4        | Réponse aux actions utilisateur < 500 ms                                                       |
| NFR5        | Au moins 100 utilisateurs simultanés                                                           |
| NFR6        | Desktop d'abord, navigateurs récents (Chrome, Firefox, Safari, Edge) ; tablette utilisable     |
| NFR7 / NFR8 | Mots de passe jamais stockés en clair ; HTTPS partout                                          |
| NFR9        | RGPD : hébergement UE, suppression des données ; l'export n'est pas implémenté                 |
| NFR10       | Cabinet créé et opérationnel en < 5 min                                                        |
| NFR11       | Fiche candidat complète créée en < 3 min                                                       |
| NFR12       | Candidat retrouvé par recherche ou tags en < 30 s                                              |
| NFR13       | Fiche partageable générée en < 1 min                                                           |
| NFR14       | Limitation de débit sur l'authentification, le partage, les uploads et les écritures sensibles |
| NFR15       | Fichiers bornés : photo ≤ 2 Mo, CV ≤ 5 Mo                                                      |
| NFR16       | Accessibilité WCAG AA (voir §3)                                                                |

Modèle de données : voir `architecture.md`.

## 3. Objectifs UI/UX

### Principes

| Principe                    | Traduction concrète                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Simple et rapide            | Peu de clics, quasiment rien à apprendre, aucune fonction superflue                                                 |
| « Centre de contrôle »      | Barre de navigation en en-tête, toujours visible (Tableau de bord, Candidats, Offres, Clients, Paramètres)          |
| Recherche omniprésente      | Barre globale dans l'en-tête, raccourci Cmd/Ctrl+K                                                                  |
| Saisie sans rupture         | Widget de note flottant (bouton + Cmd/Ctrl+J), enregistrement automatique, navigation possible pendant la saisie    |
| Repérage visuel             | Tags colorés, badges de statut pour les offres et les candidatures                                                  |
| Chaleureux et professionnel | Fond crème, terracotta pour l'action principale, vert sauge pour le secondaire ; à l'opposé des ATS bleus et froids |

### Écrans clés

| Écran                    | Rôle                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Tableau de bord          | Vue d'ensemble : compteurs et éléments récents                                         |
| Liste / fiche candidat   | Liste filtrable ; fiche en layout CV avec tags, CV, candidatures, notes et partage     |
| Liste / fiche offre      | Liste filtrable ; fiche avec client, contact, candidats associés et leur statut, notes |
| Liste / fiche client     | Entreprises, contacts, villes et offres liées                                          |
| Mes notes                | Notes libres à organiser et à rattacher                                                |
| Recherche                | Résultats complets d'une requête globale                                               |
| Paramètres               | Profil, cabinet, équipe et invitations                                                 |
| Page publique de partage | Fiche complète ou anonymisée, sans compte                                              |

### Accessibilité (WCAG AA)

Contrastes suffisants, navigation complète au clavier, focus visible, libellés et textes alternatifs sur tous les éléments interactifs.

## 4. Épics

| Épic                             | Objectif                                                                                              | Statut |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1. Fondations & authentification | Infrastructure, inscription avec création du cabinet, connexion, invitations, structure de navigation | Livré  |
| 2. Gestion des candidats         | Fiches candidats complètes au format CV : expériences, formations, langues, photo, CV, tags           | Livré  |
| 3. Offres, clients & pipeline    | Clients et contacts, offres, candidatures avec statuts, notes partagées et rapides                    | Livré  |
| 4. Recherche, filtres & partage  | Recherche globale, filtres, partage public complet ou anonymisé, tableau de bord, paramètres          | Livré  |
| 5. Villes structurées            | Remplacer les villes en texte libre par un référentiel commun, autocomplété et filtrable              | Livré  |

### Épic 1 — Fondations & authentification

| Story | Titre                             | Résultat utilisateur                                                         |
| ----- | --------------------------------- | ---------------------------------------------------------------------------- |
| 1.1   | Mise en place du projet           | Socle applicatif déployé automatiquement                                     |
| 1.2   | Schéma de données & multi-tenant  | Les données de chaque cabinet sont isolées                                   |
| 1.3   | Inscription & création du cabinet | Un dirigeant crée son compte et son cabinet en une étape                     |
| 1.4   | Connexion & déconnexion           | L'utilisateur accède à son espace de façon sécurisée                         |
| 1.5   | Invitation de collaborateurs      | Le cabinet invite ses collègues par lien, puis le suit ou le révoque         |
| 1.6   | Tableau de bord d'accueil         | L'utilisateur arrive sur une page d'accueil, même quand elle est encore vide |
| 1.7   | Structure de navigation           | Navigation cohérente : barre de navigation en en-tête, accessibilité de base |

### Épic 2 — Gestion des candidats

| Story | Titre                        | Résultat utilisateur                                            |
| ----- | ---------------------------- | --------------------------------------------------------------- |
| 2.1   | Liste des candidats          | Le recruteur parcourt la base de candidats du cabinet           |
| 2.2   | Création d'un candidat       | Il crée une fiche à partir des informations essentielles        |
| 2.3   | Photo de profil              | Le candidat est identifiable visuellement                       |
| 2.4   | Fiche en layout CV           | Le profil complet se lit d'un coup d'œil                        |
| 2.5   | Résumé & langues             | Le profil comporte une synthèse et des langues avec leur niveau |
| 2.6   | Expériences                  | Le parcours professionnel est documenté                         |
| 2.7   | Formations                   | Le parcours académique est documenté                            |
| 2.8   | Tags candidats               | Les candidats sont catégorisés pour être retrouvés              |
| 2.9   | CV (fichier)                 | Le CV d'origine est conservé et téléchargeable                  |
| 2.10  | Formulaire d'édition complet | Toutes les informations se modifient en un seul formulaire      |

### Épic 3 — Offres, clients & pipeline

| Story | Titre                      | Résultat utilisateur                                                  |
| ----- | -------------------------- | --------------------------------------------------------------------- |
| 3.1   | Entreprises clientes       | Le recruteur gère son portefeuille de clients                         |
| 3.2   | Contacts clients           | Il sait à qui il s'adresse chez chaque client                         |
| 3.3   | Liste des offres           | Il voit toutes ses offres et leur statut                              |
| 3.4   | Création & édition d'offre | Il documente un poste et le rattache à un client et à un contact      |
| 3.5   | Tags d'offres              | Les offres sont catégorisées                                          |
| 3.6   | Fiche offre                | Il pilote le recrutement d'un poste depuis une seule page             |
| 3.7   | Association candidat-offre | Il rattache des candidats à une offre, sans doublon                   |
| 3.8   | Statuts de candidature     | Il suit l'avancement de chaque candidat sur chaque offre              |
| 3.9   | Notes sur les candidats    | L'équipe partage ses échanges et ses observations sur un candidat     |
| 3.10  | Notes sur les offres       | L'équipe partage les exigences du client et les mises à jour du poste |
| 3.11  | Widget de note rapide      | Il prend une note depuis n'importe où sans quitter sa page            |
| 3.12  | Page « Mes notes »         | Il trie ses notes libres et les rattache à un candidat ou à une offre |

### Épic 4 — Recherche, filtres & partage

| Story | Titre                         | Résultat utilisateur                                               |
| ----- | ----------------------------- | ------------------------------------------------------------------ |
| 4.1   | Recherche globale             | Candidats et offres sont trouvés depuis n'importe quelle page      |
| 4.2   | Filtres candidats             | La liste se restreint aux profils pertinents                       |
| 4.3   | Filtres offres                | Une offre précise est retrouvée rapidement                         |
| 4.4   | Génération du lien de partage | Le recruteur obtient un lien à envoyer, avec une durée de validité |
| 4.5   | Page publique complète        | Le client consulte la fiche sans compte                            |
| 4.6   | Page publique anonymisée      | Le cabinet prospecte sans révéler l'identité du candidat           |
| 4.7   | Tableau de bord final         | L'activité du cabinet s'affiche avec des chiffres réels            |
| 4.8   | Paramètres & cabinet          | Le cabinet gère son profil, ses informations et son équipe         |

### Épic 5 — Villes structurées

| Story | Titre                                | Résultat utilisateur                                                                                  |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 5.1   | Référentiel des villes               | Les villes deviennent des données structurées (les anciennes valeurs en texte libre sont abandonnées) |
| 5.2   | Recherche de villes                  | Les villes sont proposées d'abord depuis la base, puis par géocodage externe                          |
| 5.3   | Composant d'autocomplétion           | Tous les formulaires choisissent une ville de la même façon                                           |
| 5.4   | Villes du candidat                   | Plusieurs villes ordonnées reflètent les préférences géographiques                                    |
| 5.5   | Ville de l'offre                     | Chaque offre a une localisation cohérente et filtrable                                                |
| 5.6   | Villes du client                     | Les implantations d'un client sont connues                                                            |
| 5.7   | Filtres par ville                    | Candidats et offres se filtrent par ville                                                             |
| 5.8   | Réordonnancement par glisser-déposer | Les villes d'un candidat se priorisent naturellement                                                  |

## 5. Hors périmètre / post-MVP

Exclus du MVP : parsing de CV et de LinkedIn, vue Kanban, envoi d'emails, matching par IA, API publique, extension navigateur. Les évolutions prévues (rôles et permissions, etc.) sont suivies dans `TO-DO.md`.
