ALTER TABLE "IdentityVerification" ADD COLUMN "ageVerifiedAt" TIMESTAMP(3);
ALTER TABLE "IdentityVerification" ADD COLUMN "ageEvidenceStatus" TEXT NOT NULL DEFAULT 'PENDING';
CREATE TABLE "PhotoModerationReview" (
    "id" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "photoObjectKey" TEXT NOT NULL,
    "decision" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoModerationReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhotoModerationReview_profileUserId_reviewedAt_idx" ON "PhotoModerationReview"("profileUserId", "reviewedAt");
CREATE INDEX "PhotoModerationReview_moderatorId_reviewedAt_idx" ON "PhotoModerationReview"("moderatorId", "reviewedAt");
ALTER TABLE "PhotoModerationReview" ADD CONSTRAINT "PhotoModerationReview_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoModerationReview" ADD CONSTRAINT "PhotoModerationReview_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
