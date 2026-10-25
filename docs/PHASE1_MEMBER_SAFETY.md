# Phase 1: member safety and discovery

## Deploying

Deploy the API and mobile app together. Apply the additive migration in
`server/prisma/migrations/20261024_phase1_member_safety/migration.sql` to the
existing database using the established migration workflow, then generate the
Prisma client and build the API. The new client requires the safety routes and
gender fields. The migration is additive and retains existing member records.
It was applied through Prisma to an isolated Neon validation branch, then to
the configured production database on 24 October 2026. SQL lock and statement
timeouts keep the migration from waiting indefinitely for table locks.

## Member behavior

- Discover, Likes and Matches expose Safety options. Reports support seven
  categories, optional details and an optional block (selected by default).
- Blocks work both ways, remove likes and close matches in one transaction.
  Profile → Blocked members allows unblocking only a block created by that
  member. Unblocking never restores previous likes or closed matches.
- Unmatching is permanent, removes both likes, and persists a pass. A direct
  API request cannot reopen a closed match.
- Passes are stored on the server. Passed pairs are excluded reciprocally from
  Discover and incoming Likes, and cannot create a match through direct likes.
  There is currently no pass-reset feature.
- Gender is optional in Edit profile. Partner preferences can include multiple
  genders; an empty selection accepts everyone. A profile with unspecified
  gender is excluded when the other member selects specific genders. Existing
  clients that omit partnerGenders preserve the stored selection.
- Age, city, relationship goal and gender preferences apply reciprocally to
  Discover, incoming Likes and new likes. Existing matches survive preference
  changes and hiding from discovery; blocks, unmatching and moderation remove
  them from the member experience.
- Updating occupation, city, gender, interests, values or relationship goals
  preserves approval. An actual display-name or introduction change requires
  reapproval. Submitting unchanged reviewed fields does not reset approval.
  Removing required profile information still deactivates discovery through
  the existing activation rules. Photo and identity review rules are unchanged.

## Moderation

The admin workspace has a Safety reports queue with OPEN, REVIEWING and
RESOLVED filters and pagination. Moderators inspect the reported member through
the existing member drawer, record notes and review or resolve the report.
Resolving a report does not automatically change account approval. Account
decisions use the existing moderated account controls. Report participants
cannot review their own report. Private report content is never returned to
the reported member; repeated open reports for the same category are deduplicated.

Member endpoints: `GET /safety/blocks`, `POST /safety/members/:id/block`,
`POST /safety/members/:id/unblock`, `POST /safety/members/:id/report`,
`POST /safety/matches/:id/unmatch`, `POST /discovery/:id/pass`.
Moderator endpoints: `GET /safety/reports?status=OPEN&page=1`,
`POST /safety/reports/:id/review` (status and resolution).

## Verification and dependencies

Run mobile lint and typecheck, API build and unit tests, and the admin build.
The PostgreSQL CI smoke suite now includes `scripts/phase1-integration.cjs`.
It requires `NODE_ENV=test`, `CI=1` and a disposable database; it seeds synthetic
verification evidence and must never run against a real member database.

Dependency overrides pin Zod 4.6.7, Multer 2.5.0 and deepmerge-ts 8.0.2. API
audit reports zero vulnerabilities. Mobile audit still reports five high
findings, all from the node-forge advisory and its dependent Expo packages:
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
At implementation time, npm's latest node-forge release is 1.4.0 and is affected;
no patched release is available. Do not run `npm audit fix --force`, which
proposes downgrading Expo 58 to 44. The existing audit CI gate remains enabled
and fails until this upstream issue is resolved. Review the overrides when
upstream packages adopt patched dependencies.

The five-tab navigation still requires the requested on-device design review.
Appeals, account deletion and recovery flows belong to the remaining account
controls backlog; they are not included in this Phase 1 increment.

Account deletion is now implemented in a later increment; see [ACCOUNT_DELETION.md](./ACCOUNT_DELETION.md) for behavior and production approval requirements. Appeals and recovery remain outside this increment.
