BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'NON_BINARY', 'OTHER');
ALTER TABLE "Profile" ADD COLUMN "gender" "Gender";
ALTER TABLE "PartnerPreference" ADD COLUMN "partnerGenders" "Gender"[] NOT NULL DEFAULT ARRAY[]::"Gender"[];
CREATE TABLE "Pass" (
  "id" TEXT NOT NULL,
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pass_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Pass_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Pass_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Pass_fromId_toId_key" ON "Pass"("fromId", "toId");
CREATE INDEX "Pass_toId_idx" ON "Pass"("toId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");
ALTER TABLE "SafetyReport" ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "resolution" VARCHAR(2000), ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "SafetyReport_status_createdAt_idx" ON "SafetyReport"("status", "createdAt");
CREATE INDEX "SafetyReport_reporterId_createdAt_idx" ON "SafetyReport"("reporterId", "createdAt");

COMMIT;
