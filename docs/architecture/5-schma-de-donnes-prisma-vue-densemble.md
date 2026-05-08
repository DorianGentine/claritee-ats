# 5. Schéma de données (Prisma) – Vue d’ensemble

Les 16 entités du PRD sont modélisées comme suit. Le schéma Prisma complet est dans `prisma/schema.prisma`.

| Entité         | Rôle principal                          | Clé multi-tenant |
|----------------|------------------------------------------|-------------------|
| Company        | Cabinet (tenant)                         | -                 |
| User           | Utilisateur (lié à Supabase Auth par id) | companyId         |
| Invitation     | Invitation collaborateur                 | companyId         |
| Candidate      | Fiche candidat                           | companyId         |
| Experience     | Expérience pro d’un candidat            | via Candidate     |
| Formation      | Formation d’un candidat                  | via Candidate     |
| Language       | Langue d’un candidat                    | via Candidate     |
| Tag            | Tag (candidats / offres)                 | companyId         |
| CandidateTag   | Liaison candidat – tag                  | via Candidate/Tag |
| ClientCompany  | Entreprise cliente                       | companyId         |
| ClientContact  | Contact d’une entreprise cliente        | via ClientCompany |
| JobOffer       | Offre d’emploi                          | companyId         |
| OfferTag       | Liaison offre – tag                     | via JobOffer/Tag  |
| Candidature    | Association candidat – offre + statut   | via Candidate/JobOffer |
| Note           | Note (candidat ou offre)                 | companyId         |
| ShareLink      | Lien de partage fiche candidat          | via Candidate     |

Détails des champs, contraintes et relations : voir `prisma/schema.prisma` et la section 6 ci-dessous.

---
