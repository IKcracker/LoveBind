-- Save the Google Place ID for a user-selected city. Existing city labels stay intact.
ALTER TABLE "Profile" ADD COLUMN "cityPlaceId" VARCHAR(255);
