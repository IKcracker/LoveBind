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

## Troubleshooting: session creation returns 502

LoveBind now maps known Didit HTTP statuses to safe error codes, with short
server-side logs like `Didit create-session: upstream HTTP 401`. It never logs
API keys, session URLs, provider response text, ID numbers or selfie details.

Read the Render logs for the API service that handled the attempt:

- **HTTP 400 or 422**: rejected payload or workflow. Confirm that
  `DIDIT_WORKFLOW_ID` is the ID of a published/active workflow.
- **HTTP 401**: API key rejected. Use the **application API key**, not the
  webhook signing secret.
- **HTTP 403**: permissions or application/workflow mismatch; verify that
  both credentials belong to the same Didit application and environment.
- **HTTP 404**: workflow/session not found in the current application.
- **HTTP 402**: credits/balance issue may be preventing verification.
- **HTTP 429**: rate limited.
- **HTTP 5xx**: Didit service issue.
- **Malformed successful response**: Didit did not return a session ID and
  valid hosted URL, or their response format changed.
- **Network failure**: Render could not reach Didit or the request timed out.

The backend never accepts arbitrary verification URL redirects. It accepts
HTTPS links on `didit.me` domains, and also normalizes Didit's documented
`verify.didit.me/...` format if the protocol is omitted.

Before investigating, confirm Render has deployed a commit containing these
changes and the same live Render service has both `DIDIT_API_KEY` and
`DIDIT_WORKFLOW_ID`. Changing Expo code alone cannot fix the backend's
upstream Didit request. Never send credentials or provider response bodies
in a screenshot or support message.
