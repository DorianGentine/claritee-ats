# Epic 2: Gestion des Candidats

**Réf. wireframes :** §2 Liste Candidats, §3 Fiche Candidat (layout CV) — **Réf. architecture :** §5 (Candidate, Experience, Formation, Language, Tag), §8 (Storage photos/cvs), §9 (router candidate).

## Epic Goal

Permettre la création, consultation, modification et suppression complète des fiches candidats avec toutes leurs informations (expériences, formations, langues), upload de CV, système de tags, et affichage avec un layout professionnel type CV. À la fin de cet epic, un recruteur peut gérer sa base de candidats de manière complète.

## Story 2.1: Candidate List Page

**As a** recruiter,  
**I want** to see a list of all my cabinet's candidates,  
**so that** I can browse and access candidate profiles.

**Acceptance Criteria:**

1. Candidates page accessible from main navigation
2. Displays list of candidates as cards or table rows
3. Each candidate shows: photo (or initials placeholder), full name, title, city
4. List sorted by most recently created by default
5. Empty state with illustration and "Ajouter un candidat" CTA
6. "Nouveau candidat" button prominently displayed (terracotta CTA)
7. Click on candidate navigates to candidate detail page
8. List only shows candidates from user's company (RLS enforced)
9. Pagination or infinite scroll for large lists (>20 candidates)
10. Loading skeleton while fetching data

**Réf.** Wireframes §2 Liste Candidats (recherche, filtres Tags/Ville, cartes photo + nom + titre + ville, max 3 tags, pagination 20/page) ; Design System (cards, bouton terracotta).

## Story 2.2: Create Candidate - Basic Information

**As a** recruiter,  
**I want** to create a new candidate with basic information,  
**so that** I can start building their profile.

**Acceptance Criteria:**

1. "Nouveau candidat" opens creation form (modal or dedicated page)
2. Form fields: firstName*, lastName*, email, phone, linkedinUrl, title, city
3. Required fields marked with asterisk, validated on submit
4. Email format validation if provided
5. LinkedIn URL format validation if provided (linkedin.com/in/...)
6. Phone format flexible (accepts various French formats)
7. Successful creation redirects to candidate detail page
8. Candidate associated with user's company automatically
9. Form shows loading state during submission
10. Cancel button returns to candidate list without saving

**Réf.** Architecture §8 (Storage bucket `photos`, path `{companyId}/candidates/{candidateId}/`), validations Zod.

## Story 2.3: Candidate Profile Photo Upload

**As a** recruiter,  
**I want** to upload a photo for a candidate,  
**so that** their profile is visually identifiable.

**Acceptance Criteria:**

1. Photo upload available on candidate creation and edit forms
2. Accepts image formats: JPG, PNG, WebP
3. File size limit: 2 MB max with clear error message
4. Image uploaded to Supabase Storage in company-specific folder
5. Image URL stored in candidate record
6. Preview shown after upload, before form submission
7. Option to remove/replace existing photo
8. Default placeholder (initials) shown when no photo
9. Photos served via Supabase CDN URL
10. Circular crop/display of photo in UI
11. Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3)

**Réf.** Architecture §8 bucket `photos`, path `{companyId}/candidates/{candidateId}/`, max 2 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3.

## Story 2.4: Candidate Detail Page - CV Layout

**As a** recruiter,  
**I want** to view a candidate's full profile in a professional CV-style layout,  
**so that** I can review all their information at a glance.

**Acceptance Criteria:**

1. Candidate detail page with professional CV-inspired layout
2. **Header section:** Photo, full name, title, city, contact info (email, phone, LinkedIn)
3. **Two-column layout below header:**
   - Left column (narrow): Languages, tags, summary/résumé
   - Right column (wide): Experiences, formations
4. "Modifier" button to edit candidate information
5. "Supprimer" button with confirmation modal
6. Back navigation to candidate list
7. Responsive layout (stacks to single column on smaller screens)
8. Applies branding colors (beige background, terracotta accents)
9. Print-friendly styling (optional but nice to have)
10. Loading state while fetching candidate data

**Réf.** Wireframes §3 Fiche Candidat : header (photo 80px, nom, titre, ville, contacts), 2 colonnes (gauche 30 % : langues, tags, résumé, CV ; droite 70 % : expériences, formations), offres associées, notes ; Design System (palette, typo).

## Story 2.5: Candidate Summary & Languages

**As a** recruiter,  
**I want** to add a summary and languages to a candidate profile,  
**so that** I can capture their overview and language skills.

**Acceptance Criteria:**

1. "Résumé" field: multi-line textarea (500 chars max recommended)
2. Languages section with add/remove capability
3. Each language entry: language name + proficiency level
4. Proficiency levels: Notions, Intermédiaire, Courant, Bilingue, Natif
5. Common languages pre-suggested: Français, Anglais, Espagnol, Allemand, Italien
6. Custom language entry allowed
7. Languages displayed as badges/pills in CV layout
8. Edit inline or via edit form
9. Changes saved with explicit save action
10. Validation: at least language name required per entry

**Réf.** Wireframes §3 colonne gauche (langues en badges), résumé 500 caractères ; schéma Prisma Language.

## Story 2.6: Candidate Experiences (CRUD)

**As a** recruiter,  
**I want** to add, edit, and remove professional experiences on a candidate profile,  
**so that** I can document their career history.

**Acceptance Criteria:**

1. Experiences section on candidate detail page
2. "Ajouter une expérience" button
3. Experience form fields: title*, company*, startDate*, endDate (optional = current), description
4. Date picker for start/end dates (month + year)
5. "Poste actuel" checkbox auto-clears endDate
6. Plain text for description (textarea)
7. Experiences displayed in reverse chronological order
8. Edit button on each experience opens edit form
9. Delete button with confirmation
10. Empty state: "Aucune expérience ajoutée"

## Story 2.7: Candidate Formations (CRUD)

**As a** recruiter,  
**I want** to add, edit, and remove education/formations on a candidate profile,  
**so that** I can document their academic background.

**Acceptance Criteria:**

1. Formations section on candidate detail page
2. "Ajouter une formation" button
3. Formation form fields: degree/title*, field/domain, school*, startDate, endDate
4. Date picker for dates (year, optionally month)
5. Formations displayed in reverse chronological order
6. Edit button on each formation opens edit form
7. Delete button with confirmation
8. School name with optional location
9. Empty state: "Aucune formation ajoutée"
10. Displayed in right column of CV layout, below experiences

**Réf.** Wireframes §3 colonne droite (expériences puis formations, ordre chrono inversé).

## Story 2.8: Candidate Tags System

**As a** recruiter,  
**I want** to add and remove tags on candidates,  
**so that** I can categorize and later filter them.

**Acceptance Criteria:**

1. Tags section visible on candidate detail page (left column)
2. "Ajouter un tag" input with autocomplete from existing tags
3. Create new tag on-the-fly if not exists
4. Tags scoped to company (each company has its own tag library)
5. Tags displayed as colored badges/chips (colors auto-assigned)
6. Click X on tag to remove from candidate
7. Tag colors auto-assigned from palette
8. Maximum 20 tags per candidate (reasonable limit)
9. Tags searchable and filterable (foundation for Epic 4)
10. Tag model in database: id, name, color, companyId

**Réf.** Design System §2 « Palette de tags » (couleurs auto-assignées, cycle hash % 8) ; wireframes §3 (badges tags, « + Ajouter »).

## Story 2.9: Candidate CV File Upload

**As a** recruiter,  
**I want** to upload a candidate's CV file,  
**so that** I can keep their original document on file.

**Acceptance Criteria:**

1. CV upload section on candidate detail page
2. Accepts PDF, DOC, DOCX formats
3. File size limit: 5 MB max
4. File uploaded to Supabase Storage (company/candidates/[id]/)
5. File URL stored in candidate record
6. Download link displayed after upload
7. File name displayed (original filename preserved)
8. Option to replace existing CV
9. Option to delete CV
10. Preview not required for MVP (just download link)
11. Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3)

**Réf.** Architecture §8 bucket `cvs`, path `{companyId}/candidates/{candidateId}/`, max 5 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3 « CV: doc.pdf 📥 ».

## Story 2.10: Edit Candidate - Full Form

**As a** recruiter,  
**I want** to edit all candidate information from a single form,  
**so that** I can make comprehensive updates efficiently.

**Acceptance Criteria:**

1. "Modifier" button on candidate detail opens edit mode/form
2. All basic fields editable: name, email, phone, LinkedIn, title, city, summary
3. Photo changeable from edit form
4. Languages editable inline
5. Experiences and formations editable via their respective sub-forms
6. Tags editable from edit form
7. CV replaceable from edit form
8. "Enregistrer" saves all changes
9. "Annuler" discards changes and returns to view mode
10. Validation errors prevent save and highlight problematic fields

**Réf.** Wireframes §3 actions Modifier (outline), Supprimer (destructive) ; formulaire cohérent avec création et sous-formulaires expériences/formations/langues/tags.

---
