CREATE TABLE "IdentityVerification" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "providerSessionId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'Not Started',
 "consentAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "lastCheckedAt" TIMESTAMP(3),
 CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdentityVerification_userId_key" ON "IdentityVerification"("userId");
CREATE UNIQUE INDEX "IdentityVerification_providerSessionId_key" ON "IdentityVerification"("providerSessionId");
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
