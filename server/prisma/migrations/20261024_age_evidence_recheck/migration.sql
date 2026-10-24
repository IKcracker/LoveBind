CREATE TABLE "AgeEvidenceRecheck" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "source" VARCHAR(20) NOT NULL,
  "outcome" VARCHAR(25) NOT NULL DEFAULT 'STARTED',
  "previousStatus" VARCHAR(30) NOT NULL,
  "resultStatus" VARCHAR(30),
  "issue" VARCHAR(60),
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AgeEvidenceRecheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgeEvidenceRecheck_memberId_checkedAt_idx" ON "AgeEvidenceRecheck"("memberId","checkedAt");
CREATE INDEX "AgeEvidenceRecheck_moderatorId_checkedAt_idx" ON "AgeEvidenceRecheck"("moderatorId","checkedAt");
ALTER TABLE "AgeEvidenceRecheck" ADD CONSTRAINT "AgeEvidenceRecheck_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgeEvidenceRecheck" ADD CONSTRAINT "AgeEvidenceRecheck_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
