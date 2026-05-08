# User Interface Design Goals

## Overall UX Vision

Claritee ATS vise une expérience utilisateur **simple, rapide et professionnelle**. L'interface doit être épurée et focalisée sur l'essentiel, évitant la surcharge fonctionnelle des ATS traditionnels. L'utilisateur (recruteur) doit pouvoir accomplir ses tâches quotidiennes en un minimum de clics, avec une courbe d'apprentissage quasi nulle.

L'application doit donner une impression de **"centre de contrôle"** où tout est accessible rapidement, permettant au recruteur de se concentrer sur son cœur de métier plutôt que sur l'outil.

## Key Interaction Paradigms

- **Navigation directe** : Accès rapide aux entités principales (Candidats, Offres, Clients) via une sidebar ou navigation principale permanente
- **Création fluide** : Formulaires de création optimisés avec validation en temps réel et autocomplétion où possible
- **Recherche omniprésente** : Barre de recherche globale accessible depuis toutes les pages
- **Notes rapides** : Bouton flottant (FAB) ou raccourci clavier pour créer une note depuis n'importe où sans quitter le contexte actuel
- **Tags visuels** : Système de tags colorés (couleurs auto-assignées) pour identifier rapidement les candidats et offres
- **Statuts clairs** : Indicateurs visuels de statut (badges, couleurs) pour suivre l'avancement des candidats par offre

## Core Screens and Views

1. **Dashboard** : Vue d'ensemble avec métriques clés (candidats récents, offres actives, actions en attente)
2. **Liste Candidats** : Vue tabulaire/cards avec recherche, filtres par tags, et accès rapide aux fiches
3. **Fiche Candidat** : Layout type CV avec header (photo, infos contact), 2 colonnes (expériences/formations), section notes et statuts par offre
4. **Liste Offres** : Vue avec statuts visuels (À faire/En cours/Terminé), filtres par rémunération, ville, tags
5. **Fiche Offre** : Détails de l'offre, client associé, liste des candidats liés avec leurs statuts
6. **Liste Clients** : Entreprises clientes avec leurs contacts et offres associées
7. **Page Partage Public** : Fiche candidat accessible sans connexion (version normale ou anonymisée)
8. **Gestion Cabinet** : Paramètres, invitation de collaborateurs, liste des membres

## Accessibility: WCAG AA

L'application doit respecter les standards WCAG AA pour garantir une accessibilité de base :
- Contraste suffisant entre texte et fond
- Navigation au clavier possible
- Labels et alt-text appropriés
- Focus visible sur les éléments interactifs

## Branding

L'application adoptera une identité visuelle **chaleureuse et professionnelle** basée sur l'illustration de référence fournie :

- **Palette de couleurs** :
  - **Fond** : Beige/crème chaleureux (#F5F0E8 approx.)
  - **Primaire / CTAs principaux** : Terracotta/rouille (#B85A3B approx.) - boutons d'action, liens importants, états actifs
  - **Secondaire / CTAs secondaires** : Vert sauge/teal (#5A7A6E approx.) - boutons secondaires, navigation, éléments de structure
  - **Surfaces** : Blanc cassé (#FDFCFA approx.) pour les cards et contenus
  - **Texte** : Noir/gris foncé pour lisibilité

- **Typographie** : Sans-serif moderne et lisible
- **Style** : Look & feel chaleureux, humain, inspiré de l'illustration (formes organiques, tons naturels)
- **Différenciation** : Cette palette se distingue des ATS traditionnels (bleus froids corporates) et renforce le positionnement "simple et humain" de Claritee

*Note: L'illustration de référence servira de base pour le Design System à créer par le UX Expert.*

## Target Device and Platforms: Web Responsive (Desktop-first)

- **Priorité Desktop** : L'interface est conçue principalement pour une utilisation sur ordinateur (écrans >= 1024px)
- **Responsive de base** : L'application doit rester utilisable sur tablette, mais l'expérience mobile n'est pas prioritaire pour le MVP
- **Navigateurs supportés** : Chrome, Firefox, Safari, Edge (versions récentes)

## Key User Flows

**Flow 1: Onboarding Cabinet**
```
Landing Page → Inscription (form) → Création Company + User → Dashboard (vide) → Paramètres → Invitation collaborateurs → Copier URL
```

**Flow 2: Ajout et partage candidat**
```
Dashboard → Liste Candidats → Nouveau Candidat (form) → Fiche Candidat (création) → Ajout expériences → Ajout formations → Ajout tags → Partager → Choisir type (normal/anonyme) → Copier URL → Envoi au client
```

**Flow 3: Pipeline recrutement**
```
Liste Offres → Nouvelle Offre (form + client) → Fiche Offre → Associer Candidats (sélection multiple) → Modifier statuts candidats → Ajouter notes → Suivi pipeline
```

**Flow 4: Recherche et découverte**
```
N'importe quelle page → Barre recherche (Cmd+K) → Saisie requête → Résultats dropdown → Clic résultat → Fiche détail
                      → Liste Candidats → Filtres (tags, ville) → Liste filtrée → Fiche candidat
```

**Flow 5: Note rapide**
```
N'importe quelle page → FAB (ou Cmd+N) → Modal note → Saisie contenu → Association optionnelle (candidat/offre) → Enregistrer → Toast confirmation
```

---
