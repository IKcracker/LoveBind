-- GeoNames cities1000 is loaded separately by the one-time import script.
-- This migration is additive and does not modify existing member profiles.
CREATE TABLE "GeoCity" (
  "id" INTEGER NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "asciiName" VARCHAR(120) NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "admin1Code" VARCHAR(40),
  "population" INTEGER NOT NULL DEFAULT 0,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "GeoCity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GeoCity_countryCode_idx" ON "GeoCity"("countryCode");
CREATE INDEX "GeoCity_population_idx" ON "GeoCity"("population");
-- Fast case-insensitive prefix lookup on names and ASCII spellings.
CREATE INDEX "GeoCity_name_prefix_idx" ON "GeoCity" (lower("name") text_pattern_ops);
CREATE INDEX "GeoCity_ascii_name_prefix_idx" ON "GeoCity" (lower("asciiName") text_pattern_ops);
