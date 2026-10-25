SET lock_timeout = '5s';
SET statement_timeout = '30s';
CREATE TABLE "AccountDeletion" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "financialUntil" TIMESTAMP(3) NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "photoReviewEvidence" JSONB NOT NULL,
  "safetyPurgedAt" TIMESTAMP(3), "financialPurgedAt" TIMESTAMP(3),
  "holdUntil" TIMESTAMP(3), "holdReference" TEXT
);
CREATE INDEX "AccountDeletion_retentionUntil_idx" ON "AccountDeletion"("retentionUntil");
CREATE TABLE "DeletionTask" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "kind" TEXT NOT NULL, "target" TEXT,
  "notBefore" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT
);
CREATE INDEX "DeletionTask_completedAt_notBefore_idx" ON "DeletionTask"("completedAt", "notBefore");
CREATE TABLE "DeletionAttempt" (
  "userId" TEXT PRIMARY KEY, "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count" INTEGER NOT NULL DEFAULT 0
);
-- Database-level invariants also protect in-flight requests from older API replicas.
CREATE OR REPLACE FUNCTION lovebind_require_live_members() RETURNS trigger AS $$
DECLARE member_id TEXT; member_status "AccountStatus"; ids TEXT[] := '{}'; col TEXT;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    ids := array_append(ids, to_jsonb(NEW)->>col);
  END LOOP;
  FOR member_id IN SELECT DISTINCT unnest(ids) ORDER BY 1 LOOP
    SELECT "status" INTO member_status FROM "User" WHERE "id" = member_id FOR SHARE;
    IF member_status IS NULL OR member_status = 'DELETED' THEN
      RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lovebind_no_restore() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'DELETED' AND (NEW."status" <> 'DELETED' OR
      NEW."authSubject" <> OLD."authSubject" OR NEW."adminApprovalStatus" <> OLD."adminApprovalStatus") THEN
    RAISE EXCEPTION 'Deleted accounts cannot be restored' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS deletion_no_restore ON "User";
CREATE TRIGGER deletion_no_restore BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION lovebind_no_restore();
DROP TRIGGER IF EXISTS deletion_live_member ON "Profile";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "Profile" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "PartnerPreference";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "PartnerPreference" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "EmailCredential";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "EmailCredential" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "AuthSession";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "AuthSession" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "IdentityVerification";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "IdentityVerification" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "ConsentRecord";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "ConsentRecord" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('userId');
DROP TRIGGER IF EXISTS deletion_live_member ON "Like";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "Like" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('fromId','toId');
DROP TRIGGER IF EXISTS deletion_live_member ON "Pass";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "Pass" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('fromId','toId');
DROP TRIGGER IF EXISTS deletion_live_member ON "Block";
CREATE TRIGGER deletion_live_member BEFORE INSERT OR UPDATE ON "Block" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_members('blockerId','blockedId');
DROP TRIGGER IF EXISTS deletion_live_match ON "Match";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "Match" FOR EACH ROW
  WHEN (NEW."status" = 'ACTIVE') EXECUTE FUNCTION lovebind_require_live_members('userAId','userBId');

CREATE OR REPLACE FUNCTION lovebind_require_live_match() RETURNS trigger AS $$
DECLARE match_id TEXT; member_id TEXT; member_status "AccountStatus"; m "Match";
BEGIN
  IF TG_TABLE_NAME = 'Message' THEN
    SELECT "matchId" INTO match_id FROM "Conversation" WHERE "id" = NEW."conversationId";
  ELSIF TG_TABLE_NAME IN ('QuizAnswer', 'CompatibilityAssessment') THEN
    SELECT "matchId" INTO match_id FROM "QuizSession" WHERE "id" = NEW."sessionId";
  ELSE
    match_id := NEW."matchId";
  END IF;
  SELECT * INTO m FROM "Match" WHERE "id" = match_id;
  IF m.id IS NULL OR m.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Match unavailable' USING ERRCODE = '23514';
  END IF;
  FOR member_id IN SELECT unnest(ARRAY[m."userAId",m."userBId"]) ORDER BY 1 LOOP
    SELECT "status" INTO member_status FROM "User" WHERE "id" = member_id FOR SHARE;
    IF member_status IS NULL OR member_status = 'DELETED' THEN
      RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS deletion_live_match ON "Conversation";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "Conversation" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_match();
DROP TRIGGER IF EXISTS deletion_live_match ON "Message";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "Message" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_match();
DROP TRIGGER IF EXISTS deletion_live_match ON "QuizSession";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "QuizSession" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_match();
DROP TRIGGER IF EXISTS deletion_live_match ON "QuizAnswer";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "QuizAnswer" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_match();
DROP TRIGGER IF EXISTS deletion_live_match ON "CompatibilityAssessment";
CREATE TRIGGER deletion_live_match BEFORE INSERT OR UPDATE ON "CompatibilityAssessment" FOR EACH ROW
  EXECUTE FUNCTION lovebind_require_live_match();
DROP TRIGGER IF EXISTS deletion_live_date ON "DateRequest";
CREATE TRIGGER deletion_live_date BEFORE INSERT OR UPDATE ON "DateRequest" FOR EACH ROW
  WHEN (NEW."status" IN ('PENDING', 'ACCEPTED')) EXECUTE FUNCTION lovebind_require_live_match();
