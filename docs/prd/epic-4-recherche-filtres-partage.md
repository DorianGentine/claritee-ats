# Epic 4: Recherche, Filtres & Partage

**Réf. wireframes :** §8 Page Partage Public, §9 Paramètres, « Barre de recherche (Cmd+K) », « Modal Partager » — **Réf. architecture :** §9 (routers shareLink, search), route publique `src/app/share/[token]/` ; rate-limiting.md §3.2 (partage).

## Epic Goal

Implémenter la recherche globale et les filtres avancés pour retrouver rapidement candidats et offres, ainsi que le système de partage de fiches candidats via URLs publiques (version normale et anonymisée). À la fin de cet epic, le MVP est complet et prêt à être utilisé par de vrais cabinets.

## Story 4.1: Global Search Bar

**As a** recruiter,  
**I want** to search across candidates and offers from anywhere,  
**so that** I can quickly find what I'm looking for.

**Acceptance Criteria:**

1. Search trigger in navigation header (icon), visible on all pages
2. Clic on icon or Cmd/Ctrl+K opens modal with search input (expandable)
3. Search queries candidates by: firstName, lastName, title, summary
4. Search queries offers by: title, description
5. Results displayed in modal as user types (debounced, 300ms)
6. Results grouped by type: "Candidats", "Offres"
7. Each result shows: name/title, subtitle (title for candidate, client for offer)
8. Click result navigates to detail page
9. "Voir tous les résultats" link for full search page (optional)
10. Keyboard shortcut: Cmd/Ctrl + K opens search
11. Empty state: "Aucun résultat pour '[query]'"
12. Minimum 2 characters to trigger search

**Réf.** Wireframes « Barre de recherche (Cmd+K) » ; implémentation : icône trigger, modal centrée ancrée en haut, résultats groupés Candidats / Offres, lien « Voir tous les résultats » accessible clavier ; Design System (champ recherche, debounce 300ms).

## Story 4.2: Candidate List Filters

**As a** recruiter,  
**I want** to filter the candidate list by tags and other criteria,  
**so that** I can narrow down to relevant candidates.

**Acceptance Criteria:**

1. Filter panel on candidates list page (sidebar or collapsible)
2. Filter by tags: multi-select from existing tags
3. Tag filter logic: AND (candidate must have ALL selected tags)
4. Filter by city: text input with autocomplete from existing cities
5. Clear filters button to reset all
6. Active filters displayed as chips above the list
7. Remove individual filter by clicking X on chip
8. Filtered count displayed: "X candidats trouvés"
9. Filters persist during session (not on page reload)
10. URL query params reflect active filters (shareable filtered views)

**Réf.** Wireframes §2 Liste Candidats (filtres Tags, Ville, chips actifs, « Effacer filtres »).

## Story 4.3: Job Offer List Filters

**As a** recruiter,  
**I want** to filter job offers by status, salary, location, and tags,  
**so that** I can find specific offers quickly.

**Acceptance Criteria:**

1. Filter panel on offers list page
2. Filter by status: checkboxes (À faire, En cours, Terminé)
3. Filter by tags: multi-select
4. Filter by salary range: min/max inputs
5. Filter by location/city: text input
6. Filter by client company: dropdown
7. Multiple filters combine with AND logic
8. Clear filters button
9. Active filters shown as chips
10. Filtered count: "X offres trouvées"

**Réf.** Wireframes §4 Liste Offres (filtres Statut, Tags, Salaire, Client, Ville).

## Story 4.4: Candidate Sharing - URL Generation

**As a** recruiter,  
**I want** to generate a shareable URL for a candidate profile,  
**so that** I can send it to clients.

**Acceptance Criteria:**

1. "Partager" button on candidate detail page
2. Click opens sharing modal/popover
3. Two options: "Fiche complète" and "Fiche anonymisée"
4. Generate unique share token for each type
5. Share URL format: `/share/[token]`
6. Token stored in database with: candidateId, type (normal/anonymous), createdAt, expiresAt
7. Copy URL button with success toast "Lien copié!"
8. Display generated URL in modal
9. Option to set expiration (7 days, 30 days, never) - default 30 days
10. Previous share links listed in modal (reuse or regenerate)
11. Rate limiting sur la création de liens : max 20 liens de partage créés par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.2)

**Réf.** Wireframes « Modal Partager » ; Architecture router `shareLink`, modèle ShareLink ; rate-limiting.md §3.2 (partage par userId).

## Story 4.5: Public Candidate Page - Normal Version

**As a** client,  
**I want** to view a shared candidate profile without logging in,  
**so that** I can review candidates sent by the recruiter.

**Acceptance Criteria:**

1. Public route `/share/[token]` accessible without authentication
2. Validates token exists and not expired
3. Displays candidate profile in CV layout (same as internal view)
4. Shows: photo, full name, title, city, summary, experiences, formations, languages
5. Contact info visible: email, phone, LinkedIn
6. Does NOT show: notes, tags, associated offers, internal data
7. Company branding/logo displayed (recruiter's company)
8. Clean, professional design optimized for client viewing
9. Expired/invalid token shows friendly error page
10. Mobile-responsive layout

**Réf.** Wireframes §8 Page Partage Public (version normale : layout CV, pas de notes/offres ; branding cabinet/Claritee) ; route `src/app/share/[token]/` (Architecture §6).

## Story 4.6: Public Candidate Page - Anonymous Version

**As a** recruiter,  
**I want** to share an anonymized candidate profile,  
**so that** I can prospect new clients without revealing candidate identity.

**Acceptance Criteria:**

1. Anonymous share type generates different token
2. Public page shows candidate profile WITHOUT:
   - firstName, lastName (replaced with "Candidat anonyme" or initials like "J.D.")
   - Photo (replaced with generic avatar)
   - Email, phone, LinkedIn (hidden)
   - Company names in experiences (replaced with "[Entreprise confidentielle]")
   - School names in formations (replaced with "[École confidentielle]")
3. Shows: title, city, summary, experience descriptions, formation fields, languages
4. Professional layout, same structure as normal version
5. "Fiche anonymisée" badge visible on page
6. Recruiter's company branding still visible
7. CTA: "Intéressé par ce profil? Contactez [company name]"
8. Link to recruiter's company contact or email
9. Same expiration logic as normal shares
10. Cannot "de-anonymize" from public page

**Réf.** Wireframes §8 version anonymisée (badge « Fiche anonymisée », CTA « Intéressé par ce profil ? Contactez [cabinet] ») ; champs masqués selon PRD.

## Story 4.7: Dashboard Metrics (Final)

**As a** recruiter,  
**I want** the dashboard to show real metrics,  
**so that** I have an overview of my cabinet's activity.

**Acceptance Criteria:**

1. Dashboard cards now show real counts:
   - Total candidats
   - Offres actives (status "En cours")
   - Total clients
2. Recent activity section:
   - Last 5 candidates added
   - Last 5 notes created
3. Quick stats per offer status (mini bar chart or counts)
4. "Candidats partagés ce mois" count
5. Click on metric card navigates to relevant list
6. Data refreshed on page load (no real-time)
7. Empty states handled gracefully
8. Performance: dashboard loads in < 1 second
9. Cached queries where appropriate
10. Welcome message if all metrics are zero (onboarding hint)

**Réf.** Wireframes §1 Dashboard (métriques réelles, 4 cards avec [Voir →], candidats récents, notes récentes) ; Architecture §9 (queries agrégées par companyId).

## Story 4.8: Settings & Company Management

**As a** cabinet admin,  
**I want** to manage my company settings and team,  
**so that** I can maintain my cabinet's configuration.

**Acceptance Criteria:**

1. Settings page accessible from navigation
2. Company info section: edit company name (SIREN read-only)
3. Team section: list of all users in company
4. Show user: name, email, join date
5. Pending invitations list with expiration date
6. Generate new invitation URL button
7. Revoke pending invitation button
8. Cannot remove yourself from company
9. No role management in MVP (all users equal)
10. Profile section: edit own firstName, lastName, email
11. Change password functionality

**Réf.** Wireframes §9 Paramètres (informations cabinet, équipe, invitations en attente, mon profil, changement mot de passe) ; Architecture router `company`, `invitation`, §7.3.

---
