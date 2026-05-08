# 9. API tRPC – Organisation des routers

- **auth** : register, login (délégation Supabase), me, logout.
- **company** : getMyCompany, updateCompany (nom ; SIREN en lecture seule).
- **invitation** : create, list, revoke, getByToken (pour page invite).
- **candidate** : list, getById, create, update, delete ; sous-routes ou procedures pour experiences, formations, languages, tags, upload photo/CV.
- **offer** : list, getById, create, update, delete ; tags ; candidatures (associer, changer statut, dissocier).
- **client** : list companies, getById, create, update, delete ; list/create/update/delete contacts.
- **note** : list (par candidateId ou offerId), create, update, delete (vérifier auteur).
- **shareLink** : create (normal/anonymous, expiration), getByToken (pour page publique), list (par candidat).

Chaque router utilise des schémas Zod (depuis `src/lib/validations/`) pour les inputs et s’appuie sur `protectedProcedure` + `ctx.companyId` pour le scope des données.

---
