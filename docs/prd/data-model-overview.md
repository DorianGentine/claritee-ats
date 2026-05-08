# Data Model Overview

Cette section présente les entités principales identifiées. Le schéma Prisma détaillé sera créé par l'Architect.

## Entités principales

```
Company
├── id (UUID, PK)
├── name (String)
├── siren (String, unique)
├── createdAt (DateTime)
└── updatedAt (DateTime)

User
├── id (UUID, PK)
├── email (String, unique)
├── firstName (String)
├── lastName (String)
├── companyId (FK → Company)
└── createdAt (DateTime)

Invitation
├── id (UUID, PK)
├── email (String)
├── token (String, unique)
├── companyId (FK → Company)
├── expiresAt (DateTime)
└── usedAt (DateTime, nullable)

Candidate
├── id (UUID, PK)
├── firstName (String)
├── lastName (String)
├── email (String, nullable)
├── phone (String, nullable)
├── linkedinUrl (String, nullable)
├── title (String, nullable)
├── city (String, nullable)
├── summary (String, nullable)
├── photoUrl (String, nullable)
├── cvUrl (String, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Experience
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── title (String)
├── company (String)
├── startDate (DateTime)
├── endDate (DateTime, nullable)
├── description (String, nullable)
└── order (Int)

Formation
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── degree (String)
├── field (String, nullable)
├── school (String)
├── startDate (DateTime, nullable)
├── endDate (DateTime, nullable)
└── order (Int)

Language
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── name (String)
└── level (Enum: NOTION, INTERMEDIATE, FLUENT, BILINGUAL, NATIVE)

Tag
├── id (UUID, PK)
├── name (String)
├── color (String)
└── companyId (FK → Company)
(Unique constraint: name + companyId)

CandidateTag (Many-to-Many)
├── candidateId (FK → Candidate)
└── tagId (FK → Tag)

ClientCompany
├── id (UUID, PK)
├── name (String)
├── siren (String, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

ClientContact
├── id (UUID, PK)
├── clientCompanyId (FK → ClientCompany)
├── firstName (String)
├── lastName (String)
├── email (String, nullable)
├── phone (String, nullable)
├── position (String, nullable)
├── linkedinUrl (String, nullable)
└── createdAt (DateTime)

JobOffer
├── id (UUID, PK)
├── title (String)
├── description (String, nullable)
├── location (String, nullable)
├── salaryMin (Int, nullable)
├── salaryMax (Int, nullable)
├── status (Enum: TODO, IN_PROGRESS, DONE)
├── clientCompanyId (FK → ClientCompany, nullable)
├── clientContactId (FK → ClientContact, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

OfferTag (Many-to-Many)
├── offerId (FK → JobOffer)
└── tagId (FK → Tag)

Candidature
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── offerId (FK → JobOffer)
├── status (Enum: CONTACTED_LINKEDIN, PHONE_CONTACT, APPLIED, ACCEPTED, REJECTED_BY_EMPLOYER, REJECTED_BY_CANDIDATE)
├── createdAt (DateTime)
└── updatedAt (DateTime)
(Unique constraint: candidateId + offerId)

Note
├── id (UUID, PK)
├── content (String)
├── authorId (FK → User)
├── candidateId (FK → Candidate, nullable)
├── offerId (FK → JobOffer, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

ShareLink
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── token (String, unique)
├── type (Enum: NORMAL, ANONYMOUS)
├── expiresAt (DateTime, nullable)
└── createdAt (DateTime)
```

## Relations clés

- **Company → Users** : 1-N (un cabinet a plusieurs utilisateurs)
- **Company → Candidates** : 1-N (isolation multi-tenant)
- **Candidate → Experiences/Formations/Languages** : 1-N
- **Candidate ↔ Tags** : N-N via CandidateTag
- **JobOffer ↔ Tags** : N-N via OfferTag
- **Candidate ↔ JobOffer** : N-N via Candidature (avec statut)
- **ClientCompany → ClientContacts** : 1-N
- **ClientCompany → JobOffers** : 1-N (optionnel)
- **JobOffer → ClientContact** : N-1 optionnel (contact référent pour l'offre)

---
