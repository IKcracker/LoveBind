# LoveBind moderation and verified adult activation (staging)

This branch adds a restricted moderator review queue and age-evidence reconciliation.
**It is not merged or deployed** until staging/CI, security and privacy checks pass.

## One-time setup

1. Create a **separate staging Neon branch** and connect a staging Render API.
2. Review and apply `server/prisma/migrations/20261024_photo_moderation_activation/migration.sql` only on staging initially; back up the live database before applying anywhere else.
3. Recover the original `20261024111839_data` Prisma migration to the repository for reproducible fresh databases. Never run `migrate reset` on a populated Neon database.
4. In your staging **Render API environment**, set `LOVEBIND_MODERATOR_IDS` to a comma-separated list of trusted `User.id` values (e.g. retrieved from your **own** authenticated `GET /auth/me`), never an email address or password. **No moderator IDs configured means nobody has access.**
5. Create a *separate reviewer account*. Users **cannot approve their own photos**.
6. Ensure your Didit KYC workflow has ID document verification, passive liveness and 1:1 face match, and its **Returned Data** tab permits `date_of_birth` to appear in the decision response. No ID photo or identification number is saved by LoveBind.
7. All R2 buckets and user photos remain private; moderator preview links expire after 120 seconds.

## Moderator workflow

Sign into the mobile app as a user whose `User.id` is in the server allowlist.
The member home includes **Photo moderation** and leads to `/moderation`.

- `GET /moderation/access` — access flag; always authenticated
- `GET /moderation/photos` — queue of up to 30 pending photos; moderator only
- `POST /moderation/photos/:userId/decision` — moderator only; requires
  `{ "decision": "APPROVED" }` or
  `{ "decision": "REJECTED", "reason": "Provide an appropriate photo" }`

Every decision writes an immutable `PhotoModerationReview` audit record with
reviewer, reviewed account, photo object key, timestamp, decision and reason.
Conditional updates prevent approving an image after it has been replaced.
Nonmoderators receive HTTP 403; unauthed callers receive HTTP 401.

## Activation and member lifecycle

LoveBind does not activate an account merely because Didit returned
`Approved`. The user presses **Check verification status**, which fetches
the Didit decision on the server. Activation requires all of:

- Didit session `Approved`
- one successful ID document check containing a valid `date_of_birth`
- successful liveness and face-match checks
- verified document birth date matching registered birth date exactly
- verified age of **18 or older** on the server
- complete profile (city, biography, relationship goal)
- a currently uploaded photo with `photoReviewStatus = APPROVED`

When all pass, `User.status` changes to `ACTIVE` and the app may subsequently
offer the **explicit visibility opt-in**. Account visibility stays off until
the member chooses to enable it. If a photo is replaced, a verification outcome
changes, or required profile data becomes incomplete, activation is revoked
and discovery visibility is turned off. Suspended and deleted accounts remain
untouched.

If Didit returns no document DOB or check results, activation fails closed.
`IdentityVerification.ageEvidenceStatus` records only `VERIFIED`, `MISSING`,
`UNDERAGE`, `DOB_MISMATCH`, `CHECKS_INCOMPLETE` or `PENDING`; its
`ageVerifiedAt` records the time. **No raw ID, selfie, extracted DOB, or
government number is stored by LoveBind.**

## Verification tests

```bash
cd server
npm run prisma:validate
npm run typecheck
npm test
npm run build
cd ..
npm run typecheck
npm run lint
```

GitHub CI uses an isolated temporary PostgreSQL database and tests moderator
access denial and the existing registration flow. Test the moderator queue,
rejections, reviewed photo previews and activation with **synthetic accounts
and sandbox Didit sessions** before accessing real users.

**Known blockers:** the root repository still lacks the original initial
Prisma migration; security audit findings in Expo dependencies; no production
moderation ops policy, appeals/retention flow, or webhook signature verification.
Do not merge into main or deploy live until these are resolved.
