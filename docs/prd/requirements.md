# Requirements

## Functional Requirements

**FR1:** Le système doit permettre l'inscription d'un utilisateur avec nom, prénom, email et mot de passe

**FR2:** Le système doit permettre la connexion/déconnexion sécurisée des utilisateurs

**FR3:** Le système doit permettre la création d'une entreprise (cabinet) avec raison sociale et SIREN unique

**FR4:** Le système doit permettre l'invitation de collaborateurs au cabinet via URL dédiée

**FR5:** Le système doit permettre la création de fiches candidats avec : nom, prénom, email, téléphone, LinkedIn, photo, titre, résumé, ville, langues

**FR6:** Le système doit permettre l'ajout d'expériences professionnelles sur une fiche candidat (titre, entreprise, dates début/fin, description)

**FR7:** Le système doit permettre l'ajout de formations sur une fiche candidat (intitulé, domaine, école, dates)

**FR8:** Le système doit permettre l'upload et le stockage d'un CV (fichier) associé à un candidat

**FR9:** Le système doit afficher les fiches candidats avec un layout type CV (header + 2 colonnes + section métier)

**FR10:** Le système doit permettre l'ajout de tags sur les candidats

**FR11:** Le système doit permettre la création d'offres d'emploi avec : titre, description, localisation, fourchette de salaire (min/max)

**FR12:** Le système doit permettre de définir un statut sur une offre d'emploi : "À faire", "En cours", "Terminé"

**FR13:** Le système doit permettre l'ajout de tags sur les offres d'emploi

**FR14:** Le système doit permettre la création d'entreprises clientes avec raison sociale et SIREN

**FR15:** Le système doit permettre l'ajout de contacts clients : nom, prénom, email, téléphone, poste, LinkedIn

**FR16:** Le système doit permettre l'association d'une offre d'emploi à une entreprise cliente

**FR16b:** Le système doit permettre l'association d'une offre d'emploi à un contact du client (optionnel)

**FR17:** Le système doit permettre l'association candidat + offre d'emploi avec un statut parmi : "Contacté sur LinkedIn", "Contact téléphonique", "Postulé", "Accepté", "Refusé par l'employeur", "Rejeté par le candidat"

**FR18:** Le système doit permettre l'ajout de notes partagées sur les fiches candidats

**FR19:** Le système doit permettre l'ajout de notes partagées sur les offres d'emploi

**FR20:** Le système doit offrir un mécanisme de prise de notes rapide accessible depuis n'importe quelle page (widget type chat, non bloquant)

**FR21:** Le système doit permettre les notes libres (non associées) et une page « Mes notes » pour les organiser et les déplacer vers candidats/offres

**FR22:** Le système doit permettre la recherche de candidats par nom, prénom, titre, résumé

**FR23:** Le système doit permettre la recherche d'offres par titre

**FR24:** Le système doit permettre le filtrage des offres par rémunération min/max, ville, tags

**FR25:** Le système doit permettre le filtrage des candidats et offres par tags

**FR26:** Le système doit permettre la génération d'une URL de partage pour une fiche candidat (version normale)

**FR27:** Le système doit permettre la génération d'une URL de partage anonymisée (sans nom, prénom, photo, contacts, noms d'entreprises et d'écoles)

**FR28:** Le système doit afficher les fiches partagées sur une page publique accessible sans connexion

## Non-Functional Requirements

**NFR1:** L'application doit utiliser exclusivement des services gratuits (Supabase free tier, Vercel free tier)

**NFR2:** Les données doivent être isolées par cabinet (multi-tenancy) - un cabinet ne peut voir que ses propres données

**NFR3:** Le temps de chargement initial de l'application doit être inférieur à 3 secondes

**NFR4:** Le temps de réponse des actions utilisateur doit être inférieur à 500ms

**NFR5:** L'application doit supporter au minimum 100 utilisateurs simultanés

**NFR6:** L'application doit être responsive sur desktop (Chrome, Firefox, Safari, Edge versions récentes)

**NFR7:** Les mots de passe doivent être hashés, jamais stockés en clair

**NFR8:** Toutes les communications doivent être en HTTPS

**NFR9:** L'application doit être conforme RGPD (données hébergées en EU, possibilité de suppression/export)

**NFR10:** Un nouveau cabinet doit pouvoir être créé et opérationnel en moins de 5 minutes

**NFR11:** Une fiche candidat complète doit pouvoir être créée en moins de 3 minutes

**NFR12:** Un candidat doit pouvoir être retrouvé via recherche/tags en moins de 30 secondes

**NFR13:** Une fiche candidat partageable doit pouvoir être générée en moins de 1 minute

## Standard Error Messages

| Situation | Message utilisateur |
|-----------|---------------------|
| Inscription : email ou SIREN indisponible | "Cette combinaison n'est pas disponible. Utilisez un autre email ou un autre numéro SIREN." |
| Identifiants invalides | "Email ou mot de passe incorrect." |
| Invitation expirée | "Cette invitation a expiré. Demandez une nouvelle invitation à votre administrateur." |
| Invitation déjà utilisée | "Cette invitation a déjà été utilisée." |
| Lien partage expiré | "Ce lien de partage a expiré. Contactez le cabinet pour obtenir un nouveau lien." |
| Lien partage invalide | "Ce lien de partage n'existe pas ou a été supprimé." |
| Limite tags atteinte | "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau." |
| Fichier trop volumineux | "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs)." |
| Format fichier invalide | "Format de fichier non supporté. Formats acceptés : [liste]." |
| Candidat déjà associé | "Ce candidat est déjà associé à cette offre." |
| Champ requis manquant | "[Nom du champ] est requis." |
| Format email invalide | "Veuillez entrer une adresse email valide." |
| Format SIREN invalide | "Le SIREN doit contenir exactement 9 chiffres." |
| Trop de requêtes (rate limit) | "Trop de requêtes. Réessayez dans quelques minutes." |

## Out of Scope (MVP)

- Scraping/parsing automatique de CV
- Scraping/parsing LinkedIn
- Vue Kanban pour le suivi des candidats
- Envoi d'emails depuis la plateforme
- Système de compétences structurées (remplacement des tags)
- Timeline unifiée notes/statuts
- Matching intelligent basé sur NLP/IA
- Extension navigateur pour import LinkedIn
- API publique pour intégrations
- Gestion des rôles/permissions différenciés

---
