-- Supprimer un utilisateur conserve ses notes (partagées dans le cabinet), sans auteur.
ALTER TABLE "Note" ALTER COLUMN "authorId" DROP NOT NULL;

ALTER TABLE "Note" DROP CONSTRAINT "Note_authorId_fkey";
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
