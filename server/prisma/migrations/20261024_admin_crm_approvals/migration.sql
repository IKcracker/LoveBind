ALTER TABLE "User" ADD COLUMN "adminApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING';
CREATE TABLE "AccountModerationDecision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "decision" VARCHAR(20) NOT NULL,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountModerationDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountModerationDecision_userId_createdAt_idx" ON "AccountModerationDecision"("userId", "createdAt");
CREATE INDEX "AccountModerationDecision_moderatorId_createdAt_idx" ON "AccountModerationDecision"("moderatorId", "createdAt");
ALTER TABLE "AccountModerationDecision" ADD CONSTRAINT "AccountModerationDecision_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountModerationDecision" ADD CONSTRAINT "AccountModerationDecision_moderatorId_fkey"
  FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
