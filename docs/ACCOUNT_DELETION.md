# User-initiated account deletion

Implemented against main `39c24992646a7aa3cc866d19888c5757409a1b87` (PRs #13 and #15).
This increment implements the account-deletion item previously excluded from Phase 1.
Recovery and appeals remain separate work. No production policy approval is implied.

## Member flow and security

Profile → Delete account explains irreversible consequences, offers a route back,
and requires the current password plus the literal `DELETE`. `POST /account/delete`
uses the authenticated member ID only; body target IDs and unknown fields are rejected.
A bearer token alone is insufficient. Five password confirmations per account per
15-minute window are allowed, counted in PostgreSQL across API replicas (including
failed attempts). Passwords are never persisted or logged by this flow.

Pending and active members can delete. Suspended members may sign in to view their
account and delete or sign out, but remain barred from ordinary member routes.
Environment-managed operator accounts require separate administrator offboarding;
this prevents startup from recreating a deleted administrative identity.

One transaction locks the user row, rechecks the session, expiry, revocation and
credential hash, replaces the authentication subject, marks the account DELETED,
erases all session records, and executes the database erasure below. Failure rolls
back both deletion and its external-cleanup tasks. PostgreSQL triggers prevent
recreating personal records or reactivating the account after deletion, including
requests admitted by an older API replica before deletion started. Concurrent
conflicts can fail safely; the user may retry. Apply the migration before API rollout.

On success the mobile client clears memory and SecureStore, invalidates pending
profile refreshes, drops protected navigation and shows a completion screen.
No local conversation/quiz persistence is used. Network failure is not presented as
successful deletion. If the commit succeeded but the response was lost, retry returns
401 because all tokens were erased; sign-in will also fail for the deleted account.
Support can check the restricted deletion receipt by the prior member ID.

## Data disposition

| Data | Implemented disposition |
| --- | --- |
| Email, password hash, sessions, auth subject | Email/hash/session rows erased atomically; auth subject replaced with a random value |
| Profile, birth date, city, bio, interests, gender, partner preferences, consents | Rows erased atomically |
| Likes, passes, blocks | Both directions erased |
| Matches | Closed permanently; minimal pair identifiers retained to prevent reopening |
| Private messages | Entire conversations in affected matches erased, including both participants' messages |
| Quiz answers and compatibility inferences | Entire shared quiz sessions, encrypted answers and assessments erased |
| Identity record | Local record erased; provider session ID retained only in a private cleanup task until provider deletion succeeds |
| Profile photos | All objects under that member's private prefix, including old/unconfirmed uploads, queued for deletion |
| Safety reports and account/age moderation decisions | Existing evidence retained under moderator-only access, then purged at the approved safety deadline; documented holds can delay purge |
| Photo moderation decisions | Decision/reason/moderator/time copied to a private receipt, without photo keys or images; purged at the safety deadline |
| Dates | Cancelled and location text removed; remaining transaction context retained until the financial deadline |
| Purchases, wallet and ledger | Restricted records retained until the financial deadline; nonzero balances/reservations require reconciliation before purge |
| Deletion receipt / tombstone | Member ID, timestamps, approved policy version and purge markers; no original name/email/DOB; retained for referential integrity and erasure evidence |

These IDs are **pseudonymous, not anonymous**. Existing safety free text may contain
personal information: it is not copied into logs, discovery, profiles or deletion
responses. Only existing moderator routes and authorised database operators can
access safety evidence. The receipt has no public or member-facing read route.
Database roles/backups must enforce equivalent restrictions. Existing moderators'
own authored decisions remain attributable by their pseudonymous member ID.

## External cleanup and operation

Build the API, then run `npm run deletion:cleanup` from `server` on a private scheduled
worker at least every five minutes, using the same database and provider credentials.
This PR does not deploy a worker or modify production data. A lease claims each task;
failures retry after 30 minutes. A crash after external deletion is safe to retry.
The worker stores only the generic `EXTERNAL_CLEANUP_FAILED` diagnostic, never raw
provider responses. Successful tasks have their target identifiers erased.

Photo sweeps wait ten minutes (existing signed upload URLs last five minutes), then
list/delete the entire exact `profiles/<member-id>/` prefix. Already-issued read URLs
can last up to two minutes. Confirm the production bucket is private and has no
version retention, CDN persistence or object lock that defeats deletion. The worker
must have ListBucket and DeleteObject permissions. Alert on pending tasks older than
one hour; investigate repeated failures without exposing member data in logs.

Didit cleanup uses `DELETE /v3/session/{id}/delete/`; only 204 and 404 count as complete.
Session creation is serialized against deletion, with compensating cleanup if its
DB write fails. Superseded sessions are now queued too. Historical sessions whose
IDs were overwritten before this change require a provider inventory/reconciliation
before launch. Provider creation followed by an unavailable database still requires
operational reconciliation; do not claim distributed transactions guarantee removal.
Didit audit records, hosted-flow links and blocklists have separate provider behavior:
[Didit deletion documentation](https://help.didit.me/data-privacy/delete-verification-data).
No new biometric/identity evidence is copied locally for deletion.

Monitor due safety/financial receipts as well as external tasks. Nonzero wallet
balances deliberately prevent financial purging, not member departure. Escalate
these to the approved settlement process; do not implement refunds by changing a
balance without a corresponding approved ledger/payment operation.

## Production release decisions — explicit approval required

The API fails closed outside tests until all are configured:

- `LOVEBIND_DELETION_POLICY_APPROVED=true` (set only after recorded approval)
- `LOVEBIND_DELETION_POLICY_VERSION=<approved-document-version>`
- `LOVEBIND_DELETION_SAFETY_DAYS=<approved integer 1–3650>`
- `LOVEBIND_DELETION_FINANCIAL_DAYS=<approved integer 1–3650>`

There are **no production retention defaults**. Tests use 30 days solely as a fixture,
not a recommendation or statement of legal requirements. Approval must resolve:

1. Applicable jurisdictions, lawful bases, retention periods for each record type,
   the minimal evidence needed for open reports and the justified lifetime of
   pseudonymous tombstones/receipts. This code is not a legal-compliance determination.
2. Whether immediate erasure of conversations, quiz answers, photos and provider
   evidence is appropriate even when a report is open. If particular evidence must
   be preserved, a separately approved scoped evidence/hold workflow must be built
   before enabling this flow; this implementation does not preserve these categories.
3. Holds: authorised operator, case-reference format, review/expiry, access audit,
   disclosure and release process. `AccountDeletion.holdUntil`/`holdReference` can
   delay retained-evidence purge. Record changes in the restricted operational audit;
   these fields do not create a hold on data already erased at account deletion.
4. Credits, refunds, pending dates, chargebacks, transaction retention and settlement.
   PayFast payment execution is not implemented on the inspected main. Do not launch
   paid credits until departure and financial reconciliation are approved and tested.
5. Provider historical cleanup, Didit independent retention/blocklists, R2 versions,
   signed links, device caches, backups, logs and disaster recovery. Restores must
   replay the deletion ledger before reopening service. Define backup expiry and
   verify restores cannot revive deleted accounts.
6. Re-registration and ban-evasion policy. Email is freed; no new email/biometric
   fingerprint is retained by this change. Retained moderation IDs alone cannot
   reliably identify a new registration.
7. Public privacy notice and in-app disclosure, support route for lost credentials,
   and any store-required web deletion request path. Password recovery and a public
   web request form are not implemented here. Verify the full release flow on iOS
   and Android, including suspended/pending accounts and assistive technology.

Do not enable production deletion before this checklist and a running/monitored
cleanup worker are approved. Disabling the gate is not a substitute for resolving
these decisions. Data deletion continues to be irreversible once enabled.

## Deployment and validation

Apply `20261025_account_deletion` via the established migration workflow; do not use
`db push` in production. Existing historical migrations lack a clean initial baseline;
the existing disposable PostgreSQL CI uses `db push`, followed by the same trigger SQL
in `prisma/deletion-guards.sql`. Keep that file identical to the migration's guard
section. Generate Prisma, deploy API and mobile together, then enable only after
release approval. Rollback must not disable guards or restore erased records.

Unit tests cover exact confirmation, production gating and provider response semantics.
`deletion-integration.cjs` is invoked by the existing HTTP/PostgreSQL smoke suite:
authentication, ID tampering, wrong passwords, throttling, multi-device revocation,
active matches, messages/quizzes, moderator-only evidence, financial retention,
cleanup retries, holds/expiry, database resurrection guards and concurrency.
It requires `NODE_ENV=test`, `CI=1`, and a disposable database. Never point it at
member data. Mobile lint/typecheck/bundles and the existing API/admin/audit checks
remain mandatory. No CI gate or audit exception is weakened by this change.
