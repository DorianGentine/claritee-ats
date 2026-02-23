-- CreateIndex
CREATE INDEX "Candidate_companyId_firstName_lastName_title_city_idx" ON "Candidate"("companyId", "firstName", "lastName", "title", "city");

-- CreateIndex
CREATE INDEX "JobOffer_companyId_title_idx" ON "JobOffer"("companyId", "title");
