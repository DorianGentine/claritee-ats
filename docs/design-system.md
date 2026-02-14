# Claritee ATS — Design System

> Document de référence pour la cohérence visuelle et l'implémentation UI du projet.  
> Framework : shadcn/ui + Tailwind CSS. Cible : Desktop-first, WCAG AA.

---

## 1. Vision & Principes

### Positionnement

Claritee ATS vise une identité **chaleureuse et humaine**, distincte des ATS corporates (bleus froids). La palette beige/terracotta/vert sauge crée une ambiance professionnelle mais accueillante.

### Principes de design

1. **Simplicité fonctionnelle** — Éviter la surcharge, focaliser sur l’essentiel.
2. **Chaleur et lisibilité** — Tons naturels, contrastes suffisants pour WCAG AA.
3. **Cohérence** — Composants réutilisables, patterns prévisibles.
4. **Accessibilité par défaut** — Contraste, focus, labels, navigation clavier.
5. **Progression douce** — Feedback immédiat, micro-interactions légères.

---

## 2. Palette de couleurs

### Couleurs principales

| Rôle | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Background** | `--background` | `#F5F0E8` | Fond global de l'app |
| **Surface** | `--card` | `#FDFCFA` | Cards, surfaces surélevées |
| **Primaire** | `--primary` | `#B85A3B` | CTAs principaux, liens importants, FAB |
| **Secondaire** | `--secondary` | `#5A7A6E` | CTAs secondaires, navigation, éléments structurants |
| **Texte** | `--foreground` | `#1A1A1A` | Texte principal |
| **Texte secondaire** | `--muted-foreground` | `#4A4A4A` | Sous-titres, labels, états désactivés |
| **Bordures** | `--border` | `#E5DFD6` | Bordures, séparateurs |

### Sémantique & Feedback

| Rôle | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Succès** | `--success` | `#4A7C59` | Confirmations, statuts positifs |
| **Attention** | `--warning` | `#C9A227` | Avertissements |
| **Erreur** | `--destructive` | `#C44B37` | Erreurs, actions destructives |
| **Info** | `--info` | `#5A7A6E` | Réutilise secondaire |

### Palette de tags (auto-assignée)

Pour les tags candidats/offres, assigner une couleur parmi :

| Couleur | Hex | Variable |
|---------|-----|----------|
| Terracotta clair | `#D4A5A5` | Tag 1 |
| Vert sauge clair | `#8FA89E` | Tag 2 |
| Beige chaud | `#C9B896` | Tag 3 |
| Lavande | `#9B8BA8` | Tag 4 |
| Pêche | `#E8C4A8` | Tag 5 |
| Teal doux | `#7A9B8E` | Tag 6 |
| Terre | `#A67B5B` | Tag 7 |
| Gris chaud | `#8B8478` | Tag 8 |

Cycle d’assignation : `colorIndex = hash(tagName) % 8`.

### Statuts candidature

| Statut | Couleur fond | Couleur texte |
|--------|--------------|---------------|
| Contacté sur LinkedIn | `#E8E4DC` | `#4A4A4A` |
| Contact téléphonique | `#E3EDE8` | `#3D5A50` |
| Postulé | `#E8EEF5` | `#3D5A6E` |
| Accepté | `#E8F5EC` | `#2E6B3E` |
| Refusé par l'employeur | `#F5E8E8` | `#8B3A3A` |
| Rejeté par le candidat | `#F5F0E8` | `#6B6359` |

### Statuts offre

| Statut | Couleur fond | Couleur texte |
|--------|--------------|---------------|
| À faire | `#E8E4DC` | `#4A4A4A` |
| En cours | `#E3EDE8` | `#3D5A50` |
| Terminé | `#E8F5EC` | `#2E6B3E` |

---

## 3. Typographie

### Familles de polices

| Usage | Famille | Fallback | Notes |
|-------|---------|----------|-------|
| **UI & Body** | `DM Sans` | `system-ui, sans-serif` | Moderne, lisible, légèrement chaleureuse |
| **Alternatives** | `Inter` ou `Source Sans 3` | idem | Si DM Sans non chargée |

### Échelle typographique

| Élément | Taille | Poids | Line height | Usage |
|---------|--------|-------|-------------|-------|
| H1 | 28px / 1.75rem | 600 | 1.2 | Titres de page |
| H2 | 22px / 1.375rem | 600 | 1.3 | Sections |
| H3 | 18px / 1.125rem | 600 | 1.4 | Sous-sections |
| Body | 15px / 0.9375rem | 400 | 1.5 | Texte courant |
| Body small | 14px / 0.875rem | 400 | 1.5 | Métadonnées, labels |
| Caption | 12px / 0.75rem | 400 | 1.4 | Timestamps, hints |
| Button | 14px / 0.875rem | 500 | 1.25 | Boutons |

### Contraste WCAG AA

- Texte principal sur fond beige : `#1A1A1A` sur `#F5F0E8` ≈ 11:1 (AAA).
- Texte secondaire : `#4A4A4A` sur `#F5F0E8` ≈ 5.5:1 (AA).
- Primaire sur fond clair : `#B85A3B` sur `#FDFCFA` ≈ 4.8:1 (AA).
- Secondaire sur fond clair : `#5A7A6E` sur `#FDFCFA` ≈ 4.2:1 (AA).

---

## 4. Espacement & grille

### Échelle d’espacement (Tailwind)

| Token | Valeur | Usage |
|-------|--------|-------|
| 1 | 4px | Espacement serré (gap icons) |
| 2 | 8px | Padding boutons, gaps courts |
| 3 | 12px | Espacement standard |
| 4 | 16px | Padding sections |
| 5 | 20px | Marges entre blocs |
| 6 | 24px | Séparations sections |
| 8 | 32px | Espacement large |
| 10 | 40px | Marges page |
| 12 | 48px | Espacement majeur |

### Grille & layout

- **Conteneur max-width** : 1280px (xl).
- **Colonnes** : 12 colonnes pour les layouts complexes.
- **Gutter** : 24px entre colonnes.
- **Layout CV (fiche candidat)** :
  - Header full-width.
  - Colonne gauche (sidebar) : ~30% (tags, langues, résumé).
  - Colonne droite : ~70% (expériences, formations).

---

## 5. Ombres & bordures

### Ombres

| Token | Valeur | Usage |
|-------|--------|-------|
| sm | `0 1px 2px rgba(26,26,26,0.06)` | Légère élévation |
| DEFAULT | `0 2px 8px rgba(26,26,26,0.08)` | Cards |
| md | `0 4px 12px rgba(26,26,26,0.1)` | Dropdowns, modals |
| lg | `0 8px 24px rgba(26,26,26,0.12)` | Modals, popovers |

### Bordures

- **Radius** : 8px (cards), 6px (inputs, boutons).
- **Épaisseur** : 1px.
- **Couleur** : `#E5DFD6` (border).

---

## 6. Composants (shadcn/ui)

### Mapping Tailwind / CSS variables

```css
:root {
  --background: #F5F0E8;
  --foreground: #1A1A1A;
  --card: #FDFCFA;
  --card-foreground: #1A1A1A;
  --popover: #FDFCFA;
  --primary: #B85A3B;
  --primary-foreground: #FFFFFF;
  --secondary: #5A7A6E;
  --secondary-foreground: #FFFFFF;
  --muted: #E8E4DC;
  --muted-foreground: #4A4A4A;
  --accent: #E3EDE8;
  --accent-foreground: #2E4A42;
  --destructive: #C44B37;
  --border: #E5DFD6;
  --input: #E5DFD6;
  --ring: #B85A3B;
}
```

### Composants principaux

| Composant | Usage | Variants |
|-----------|--------|----------|
| **Button** | CTAs, actions | default (primaire), secondary, outline, ghost, destructive |
| **Card** | Blocs de contenu | default, elevated (ombre md) |
| **Input** | Champs texte | default, avec erreur |
| **Badge** | Statuts, tags | default, outline, variantes couleur |
| **Dialog** | Modals | default |
| **DropdownMenu** | Menus contextuels | default |
| **Select** | Sélecteurs | default |
| **Tabs** | Onglets | default |
| **Avatar** | Photo utilisateur/candidat | default, fallback initiales |
| **Skeleton** | États de chargement | default |
| **Toast** | Notifications | success, error, default |

### Boutons

- **Primaire** : fond terracotta `#B85A3B`, texte blanc, hover légèrement plus foncé.
- **Secondaire** : fond vert sauge `#5A7A6E`, texte blanc.
- **Outline** : bordure `--border`, fond transparent, hover léger `--accent`.
- **Ghost** : transparent, hover léger.

### Inputs & formulaires

- Fond : `#FDFCFA`.
- Bordure : `#E5DFD6`.
- Focus : ring 2px `#B85A3B`.
- Labels au-dessus des champs, taille 14px.
- Champs requis : astérisque rouge, message d’erreur en dessous.

---

## 7. Éléments UI critiques (PRD)

### Tags

- **Apparence** : pill (border-radius full).
- **Padding** : 6px 12px.
- **Taille** : 12px ou 13px.
- **Couleurs** : fonds pastel de la palette tags, texte foncé.
- **Interaction** : X pour retirer, autocomplétion à l’ajout.
- **Limite** : 20 tags par élément.

### Badges de statut

- **Forme** : pill ou rectangle arrondi.
- **Taille** : petite (12–13px).
- **Couleurs** : selon les tables Statuts candidature / offre ci-dessus.
- Toujours avec texte lisible (contraste AA).

### FAB (Floating Action Button)

- **Position** : fixe, bas-droite (24px du bord).
- **Taille** : 56x56px.
- **Couleur** : primaire (terracotta).
- **Icône** : Plus ou Note (Lucide).
- **Ombre** : md pour le détacher du fond.
- **Raccourci** : Cmd/Ctrl + N ouvre la modal de note rapide.

### Barre de recherche globale (Cmd+K)

- **Placement** : header ou toujours visible.
- **Trigger** : input + icône loupe, ou bouton “Rechercher”.
- **Raccourci** : Cmd/Ctrl + K ouvre le command palette / recherche.
- **Résultats** : dropdown avec groupes Candidats / Offres.
- **Debounce** : 300ms.

### Layout CV (fiche candidat)

- **Header** : photo (80x80px, rond), nom, titre, ville, contacts (email, tél, LinkedIn).
- **Colonne gauche** : Langues, tags, résumé.
- **Colonne droite** : Expériences, formations (chronologique inversé).
- **Notes** : section en bas, pleine largeur.
- **Responsive** : colonnes empilées sur mobile/tablette.

---

## 8. Accessibilité (WCAG AA)

**Objectif :** conformité **WCAG 2.1 niveau AA** pour l’ensemble des écrans de l’application (voir [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa)). Les critères de contraste, focus, labels et navigation clavier ci-dessous en sont le socle.

### Contraste

- Texte normal : ratio ≥ 4.5:1.
- Texte large (≥18px ou 14px bold) : ratio ≥ 3:1.
- Composants UI et graphiques : ratio ≥ 3:1.

### Focus

- **Focus visible** : outline ou ring 2px `#B85A3B` (ou couleur primaire).
- Aucun `outline: none` sans alternative visible.
- Ordre de tabulation logique.

### Navigation clavier

- Tous les éléments interactifs accessibles au clavier.
- Modals et dropdowns : focus trap, Escape pour fermer.
- Cmd+K : recherche accessible au clavier.

### Labels & ARIA

- Tous les champs de formulaire ont un `<label>` ou `aria-label`.
- Boutons avec `aria-label` si icône seule.
- États chargement/erreur annoncés (aria-live si pertinent).

### Alt text

- Photos candidats : alt descriptif ou vide si décoratif.
- Icônes : préférer `aria-hidden="true"` si texte adjacent, sinon `aria-label`.

### Outils et vérification

- **Automatisé :** intégrer [axe-core](https://github.com/dequelabs/axe-core) (ou [@axe-core/react](https://github.com/dequelabs/axe-core-npm)) en dev / CI, et utiliser [Lighthouse](https://developer.chrome.com/docs/lighthouse/accessibility/) (onglet Accessibility) sur les pages clés avant release.
- **Manuel :** parcourir les écrans principaux au clavier uniquement (Tab, Enter, Escape) ; vérifier l’ordre de focus et l’absence de piège à focus. Tester avec un lecteur d’écran (NVDA, VoiceOver ou Narrator) sur au moins un parcours critique (ex. connexion, création candidat).
- **Checklist rapide avant merge UI :** contraste des textes et boutons, focus visible sur tous les interactifs, labels sur les champs, messages d’erreur associés aux champs (aria-describedby ou lien explicite).

---

## 9. Responsive (Desktop-first)

### Breakpoints (Tailwind)

| Breakpoint | Min | Usage |
|------------|-----|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablette |
| lg | 1024px | Desktop (prioritaire) |
| xl | 1280px | Large desktop |

### Adaptation

- **Desktop (≥1024px)** : sidebar fixe, layout 2 colonnes pour fiche candidat.
- **Tablette (768–1023px)** : sidebar repliable ou en hamburger.
- **Mobile (<768px)** : layout 1 colonne, navigation en drawer.

---

## 10. Icônes

- **Bibliothèque** : Lucide React.
- **Taille** : 16px, 20px, 24px selon contexte.
- **Style** : stroke, 1.5px.
- Cohérence sur toute l’app.

---

## 11. États & feedback

| État | Comportement |
|------|--------------|
| **Hover** | Léger assombrissement ou background accent |
| **Active** | Feedback visuel immédiat |
| **Disabled** | Opacité 0.5, cursor not-allowed |
| **Loading** | Skeleton ou spinner, désactiver les actions |
| **Erreur** | Bordure rouge, message sous le champ |
| **Succès** | Toast court, vert |

---

## 12. Référence Tailwind rapide

```js
// tailwind.config.js - extraits pertinents
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: '#B85A3B',
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#5A7A6E',
    foreground: '#FFFFFF',
  },
  muted: {
    DEFAULT: '#E8E4DC',
    foreground: '#4A4A4A',
  },
  card: {
    DEFAULT: '#FDFCFA',
    foreground: '#1A1A1A',
  },
}
```

---

## Changelog

| Date | Version | Description | Auteur |
|------|---------|-------------|--------|
| 2026-02-14 | 1.0 | Création initiale du Design System | Sally (UX Expert) |
