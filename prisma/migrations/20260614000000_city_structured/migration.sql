-- Epic 5: Villes Structurées
-- Remplace Candidate.city (String?) et JobOffer.location (String?) par une table City partagée.
-- Crée CandidateCity (N-N avec ordre) et ClientCompanyCity (N-N sans ordre).

-- Extensions PostgreSQL pour la recherche insensible aux accents (nécessaires avant l'index GIN)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable: cities (données de référence globales, sans companyId)
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(8,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- Contrainte unicité sur (name, country) pour l'upsert lors du fallback Photon
CREATE UNIQUE INDEX "cities_name_country_key" ON "cities"("name", "country");

-- CreateTable: CandidateCity (liaison N-N avec ordre)
CREATE TABLE "CandidateCity" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CandidateCity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateCity_candidateId_cityId_key" ON "CandidateCity"("candidateId", "cityId");
CREATE INDEX "CandidateCity_candidateId_idx" ON "CandidateCity"("candidateId");

-- CreateTable: ClientCompanyCity (liaison N-N sans ordre, PK composite)
CREATE TABLE "ClientCompanyCity" (
    "clientCompanyId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "ClientCompanyCity_pkey" PRIMARY KEY ("clientCompanyId","cityId")
);

-- AlterTable Candidate: supprimer city (DROP COLUMN cascade-supprime automatiquement city_idx), recréer l'index sans city
ALTER TABLE "Candidate" DROP COLUMN "city";

CREATE INDEX "Candidate_companyId_firstName_lastName_title_idx" ON "Candidate"("companyId", "firstName", "lastName", "title");

-- AlterTable JobOffer: supprimer location, ajouter cityId
ALTER TABLE "JobOffer" DROP COLUMN "location";
ALTER TABLE "JobOffer" ADD COLUMN "cityId" TEXT;

-- AddForeignKey: CandidateCity → Candidate
ALTER TABLE "CandidateCity" ADD CONSTRAINT "CandidateCity_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CandidateCity → City
ALTER TABLE "CandidateCity" ADD CONSTRAINT "CandidateCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ClientCompanyCity → ClientCompany
ALTER TABLE "ClientCompanyCity" ADD CONSTRAINT "ClientCompanyCity_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ClientCompanyCity → City
ALTER TABLE "ClientCompanyCity" ADD CONSTRAINT "ClientCompanyCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: JobOffer → City
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
