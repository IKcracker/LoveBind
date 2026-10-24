-- Additive extension for profiles already in the LoveBind database.
ALTER TABLE "Profile" ADD COLUMN "occupation" VARCHAR(100);
ALTER TABLE "Profile" ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "coreValues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "photoObjectKey" TEXT;
ALTER TABLE "Profile" ADD COLUMN "photoReviewStatus" TEXT NOT NULL DEFAULT 'NONE';
