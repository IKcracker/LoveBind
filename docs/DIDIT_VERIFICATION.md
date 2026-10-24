# LoveBind ID verification (Didit staging integration)

We use Didit's hosted verification UI: LoveBind does not capture or store national ID numbers, ID scans or selfie biometrics. Didit receives these directly after a user opts in.

## Provider setup
1. Create a Didit business account at https://business.didit.me/ and use **sandbox credentials** during testing.
2. Configure a workflow with document verification, liveness and face matching; include **age verification for 18+** and check your workflow's specific supported ID types.
3. In the **Render service environment** (not Expo), add DIDIT_API_KEY and DIDIT_WORKFLOW_ID. Never store these in the repository or client app.
4. Apply the reviewed additive SQL migration in server/prisma/migrations/20261024_didit_verification/migration.sql on a **development Neon branch**, and generate the Prisma client before deploying the server.
5. Deploy the NestJS server from branch feat/identity-onboarding to a staging Render service. This feature branch is not production ready.
6. Test from Expo against staging with EXPO_PUBLIC_API_URL=https://YOUR-STAGING-API.

## API contract
- POST /verification/session with { "consent": true } (Bearer auth): starts a hosted session and returns its URL.
- POST /verification/refresh with {} (Bearer auth): fetches Didit's server-side decision; never trusts user-submitted statuses.
- GET /verification/me (Bearer auth): returns status only (no document, ID number or biometrics).

## Security and release constraints
- Didit controls ID capture, selfie and biometric collection. The API stores only provider session ID, consent date, status and audit timestamps.
- The provider session URL is generated only on the server using DIDIT_API_KEY.
- A provider Approved status is not sufficient to activate a user: age extraction and 18+ policy enforcement, replay protection, ongoing status updates and manual safety review remain to implement.
- Profiles remain non-discoverable and User.status stays PENDING.
- Launch requires rate limiting, fraud/bot mitigation, consent/privacy policy, retention/deletion controls, status reconciliation (including webhook signatures), access logs and verified age outcome.
- Profile photo uploading requires a separate private object storage and moderation pipeline. The current UI does not upload profile photos.
- Never upload real IDs in sandbox.
