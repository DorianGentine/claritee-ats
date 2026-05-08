# Epic 3: Offres, Clients & Pipeline

**Réf. wireframes :** §4 Liste Offres, §5 Fiche Offre, §6 Liste Clients, §7 Fiche Client, modals « Note rapide » et « Partager » — **Réf. architecture :** §5 (JobOffer, ClientCompany, ClientContact, Candidature, Note), §9 (routers offer, client, note).

## Epic Goal

Permettre la gestion complète des offres d'emploi et des entreprises clientes, ainsi que le suivi des candidats par offre via un système de statuts. Implémenter également les notes partagées sur les candidats et les offres. À la fin de cet epic, un recruteur peut gérer son pipeline de recrutement complet.

## Story 3.1: Client Company List & Creation

**As a** recruiter,  
**I want** to manage my client companies,  
**so that** I can associate job offers with the right clients.

**Acceptance Criteria:**

1. Clients page accessible from main navigation
2. Displays list of client companies as cards or table
3. Each client shows: company name, SIREN, number of contacts, number of offers
4. "Nouveau client" button (terracotta CTA)
5. Creation form: companyName*, siren (optional for clients)
6. SIREN format validation if provided
7. Click on client navigates to client detail page
8. Empty state: "Aucun client ajouté"
9. List scoped to user's company (RLS)
10. Loading state while fetching

**Réf.** Wireframes §6 Liste Clients (carte raison sociale, SIREN, compteurs contacts/offres, « Nouveau client ») ; router `client`.

## Story 3.2: Client Contacts Management

**As a** recruiter,  
**I want** to add contacts to my client companies,  
**so that** I can track who I interact with at each client.

**Acceptance Criteria:**

1. Contacts section on client detail page
2. "Ajouter un contact" button
3. Contact form: firstName*, lastName*, email, phone, position/title, linkedinUrl
4. Email and LinkedIn format validation
5. Contacts displayed as list/cards on client page
6. Edit button on each contact
7. Delete contact with confirmation
8. Contact associated with client company (foreign key)
9. Empty state: "Aucun contact ajouté"
10. Quick action: click email/phone to copy to clipboard

**Réf.** Wireframes §7 Fiche Client (section Contacts, modal Ajouter/Modifier contact, champs, icône copier 📋) ; Design System (boutons outline).

## Story 3.3: Job Offer List Page

**As a** recruiter,  
**I want** to see all my job offers,  
**so that** I can manage my open positions.

**Acceptance Criteria:**

1. Offers page accessible from main navigation
2. Displays list of offers as cards
3. Each offer shows: title, client company name, location, salary range, status badge
4. Status badges with distinct colors: "À faire" (gray), "En cours" (blue/sage), "Terminé" (green)
5. "Nouvelle offre" button (terracotta CTA)
6. Click on offer navigates to offer detail page
7. Empty state: "Aucune offre créée"
8. List scoped to user's company (RLS)
9. Sort by: date created (default), status
10. Loading state while fetching

**Réf.** Wireframes §4 Liste Offres (filtres Statut/Tags/Salaire/Client, cartes titre + client + localisation + fourchette salaire, badges statut) ; Design System §2 statuts offre (À faire / En cours / Terminé).

## Story 3.4: Create & Edit Job Offer

**As a** recruiter,  
**I want** to create and edit job offers,  
**so that** I can document open positions.

**Acceptance Criteria:**

1. "Nouvelle offre" opens creation form
2. Form fields: title*, description (textarea), location, salaryMin, salaryMax, status, clientCompanyId, clientContactId
3. Client company dropdown populated from existing clients
4. Contact dropdown populated from contacts of selected client (optionnel ; si pas de client sélectionné, masqué ou vide)
5. Option to create offer without client (client optional)
6. Status dropdown: "À faire", "En cours", "Terminé" (default: "À faire")
7. Salary fields accept numbers (€, annual)
8. Description plain text (multi-line)
9. Edit form pre-populates existing data
10. Delete offer with confirmation (cascade deletes candidatures)
11. Validation: title required (contact référent optionnel)

**Réf.** Router `offer` (create, update, delete), schéma Prisma JobOffer, ClientCompany (optionnel).

## Story 3.5: Job Offer Tags

**As a** recruiter,  
**I want** to add tags to job offers,  
**so that** I can categorize and filter them.

**Acceptance Criteria:**

1. Tags section on offer detail page
2. Same tag system as candidates (shared tag library per company)
3. Add tag via autocomplete input
4. Create new tag if not exists
5. Remove tag by clicking X
6. Tags displayed as colored badges
7. Maximum 20 tags per offer
8. Tags will be filterable in Epic 4
9. Reuses Tag model from Story 2.8
10. Tags displayed on offer list cards (max 3 visible, +N more)

**Réf.** Design System palette tags ; wireframes §4 (tags sur carte offre).

## Story 3.6: Job Offer Detail Page

**As a** recruiter,  
**I want** to see full details of a job offer including linked candidates,  
**so that** I can manage the recruitment pipeline for that position.

**Acceptance Criteria:**

1. Offer detail page with header: title, status badge, client company (linked), contact référent (si défini)
2. Details section: description, location, salary range, tags, contact client (nom, email, téléphone avec lien copier)
3. "Modifier" and "Supprimer" buttons
4. **Candidats section:** List of candidates linked to this offer with their status
5. Candidate entries show: photo, name, title, status badge
6. Click on candidate opens candidate detail (or modal)
7. "Associer un candidat" button to link existing candidates
8. Empty candidats state: "Aucun candidat associé"
9. Quick status change dropdown on each candidate row
10. Count of candidates per status displayed

**Réf.** Wireframes §5 Fiche Offre (header titre/client/salaire/tags, description, section Candidats associés avec photo/nom/titre/dropdown statut/Dissocier, Notes).

## Story 3.7: Candidate-Offer Association (Candidature)

**As a** recruiter,  
**I want** to associate candidates with job offers,  
**so that** I can track which candidates are being considered for which positions.

**Acceptance Criteria:**

1. "Associer un candidat" on offer page opens candidate selector
2. Candidate selector: search/filter from company's candidate list
3. Select one or multiple candidates to associate
4. Each association creates a "Candidature" record with default status
5. Default status: "Contacté sur LinkedIn"
6. Cannot associate same candidate twice to same offer (unique constraint)
7. Association visible on both offer detail and candidate detail pages
8. Candidature model: id, candidateId, offerId, status, createdAt, updatedAt
9. Association date tracked
10. Bulk association possible (select multiple candidates)

**Réf.** Architecture §5 (Candidature), §9 router offer (candidatures) ; wireframes §5 bouton « Associer ».

## Story 3.8: Candidature Status Management

**As a** recruiter,  
**I want** to update the status of a candidate for a specific offer,  
**so that** I can track their progress in the pipeline.

**Acceptance Criteria:**

1. Status dropdown on candidature row (offer detail page)
2. Available statuses: "Contacté sur LinkedIn", "Contact téléphonique", "Postulé", "Accepté", "Refusé par l'employeur", "Rejeté par le candidat"
3. Status change saved immediately (optimistic UI)
4. Status change updates `updatedAt` timestamp
5. Status badges with distinct colors for visual clarity
6. Status history not tracked in MVP (only current status)
7. Status visible on candidate detail page (per offer)
8. Dissociate candidate from offer (remove candidature) with confirmation
9. Candidate can have different statuses on different offers
10. Filter candidates by status on offer detail page (basic)

**Réf.** Design System §2 « Statuts candidature » (6 valeurs avec couleurs fond/texte) ; wireframes §5 dropdown statut par candidat, bouton Dissocier.

## Story 3.9: Notes on Candidates

**As a** recruiter,  
**I want** to add notes on candidate profiles,  
**so that** I can document interactions and observations.

**Acceptance Criteria:**

1. Notes section on candidate detail page
2. "Ajouter une note" button or inline input
3. Note content: éditeur riche BlockNote (blocs texte, listes, titres — inspiration Notion)
4. Note metadata: author (user), createdAt timestamp
5. Notes displayed in reverse chronological order (newest first)
6. Author name displayed on each note
7. Edit own notes only (not others')
8. Delete own notes with confirmation
9. Notes visible to all company users (shared)
10. Empty state: "Aucune note"

## Story 3.10: Notes on Job Offers

**As a** recruiter,  
**I want** to add notes on job offers,  
**so that** I can document client requirements and updates.

**Acceptance Criteria:**

1. Notes section on offer detail page
2. Same note system as candidates (reuse Note model)
3. "Ajouter une note" input
4. Note content: plain text
5. Note metadata: author, createdAt
6. Reverse chronological order
7. Edit/delete own notes only
8. Notes visible to all company users
9. Note model: id, content, authorId, candidateId (nullable), offerId (nullable), companyId, createdAt
10. Empty state: "Aucune note"

**Réf.** Wireframes §5 section Notes ; router `note` (offerId).

## Story 3.11: Quick Note Widget (type chat)

**As a** recruiter,  
**I want** to quickly create and edit notes from anywhere via a floating widget,  
**so that** I can capture information without blocking navigation.

**Acceptance Criteria:**

1. Bouton flottant visible sur toutes les pages authentifiées
2. Bouton positionné bas-droite, style terracotta
3. Clic ouvre un panneau type chat widget (non bloquant, navigation possible)
4. Le widget reste ouvert et conserve son état lors de la navigation
5. Zone de saisie : éditeur BlockNote
6. Menu/liste déroulante des notes existantes, triées par dernière modification
7. Liste au-dessus de la zone de saisie ; clic sur une note l'ouvre dans le widget
8. Notes libres (non associées) ; champ titre optionnel (si vide : 30 premiers caractères)
9. Auto-save : debounce 2 secondes après dernière modification
10. Raccourci : Cmd/Ctrl + J
11. Lien vers page "Mes notes" accessible depuis le widget

**Réf.** Design chat widget : panneau flottant non bloquant ; Design System § FAB.

## Story 3.12: Page Mes notes

**As a** recruiter,  
**I want** a dedicated "Mes notes" page to view, organize, edit and move my free-standing notes to candidates or offers,  
**so that** I can manage my quick notes before associating them.

**Acceptance Criteria:**

1. Page "Mes notes" accessible depuis la navbar et le widget
2. Liste des notes libres triées par dernière modification
3. Affichage : titre (ou 30 premiers caractères), extrait, date
4. Clic ouvre l'édition (inline ou panneau)
5. Édition : titre, contenu BlockNote ; sauvegarde
6. Suppression avec confirmation
7. Possibilité de "déplacer" une note vers un candidat ou une offre
8. Empty state : "Aucune note"
9. Lien rapide pour ouvrir le widget depuis la page

**Réf.** Stories 3.9, 3.11 (notes libres, champ titre).

---
