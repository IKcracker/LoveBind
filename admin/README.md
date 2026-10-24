# LoveBind React Admin CRM (Trust & Safety)

The CRM lives in `admin/` and is a **standalone Vite + React + TypeScript** web
app. It connects to the existing LoveBind NestJS + Neon API. It is not an Expo
screen and does not replace the customer-facing mobile app.

## Local development

From the LoveBind project root:

```powershell
cd admin
npm install
Copy-Item .env.example .env.local
npm run dev
```

Visit http://localhost:5173.

In `admin/.env.local`, set `VITE_API_URL` to **your staging API origin**.
This is a browser-public value, not a secret. NEVER place R2/Didit keys in
`admin/.env.local` or a `VITE_` variable.

Run `npm run build` to typecheck and produce `admin/dist/` for a static
hosting service. When deploying, set `VITE_API_URL` at **build time** to the
staging/production API URL. Configure the backend `CORS_ORIGINS` to explicitly
include the CRM's actual HTTPS origin. Never use `*` for the admin app.

## Authentication and authorization

- Log in using an **existing LoveBind email/password** account.
- Before admitting the user to the CRM, the client calls
  `GET /moderation/access`. The NestJS API also checks
  `LOVEBIND_MODERATOR_IDS` on **every** admin/moderation endpoint.
- In your **staging Render backend** set
  `LOVEBIND_MODERATOR_IDS=moderator_user_id[,other_moderator_id]`.
  Use `User.id` from the moderator's own `GET /auth/me` or trusted DB
  inspection. Do not use email addresses, admin passwords, or secrets here.
- Use a **different moderator account** to review your own membership.
- Browser bearer tokens are held only in React memory. Refreshing the page
  requires signing in again. They are never stored in localStorage, cookie,
  or sessionStorage.
- Before exposing the CRM on the public Internet, implement strong MFA,
  device/session controls, centralized security logging, CSP, rate limiting,
  and a documented access review process.

## CRM features

- Overview: live total/active/pending/member photo metrics and safety counters.
- Members: server-side text search, approval filter, pagination and details.
- Member detail: profile basics, Didit and age evidence statuses,
  short-lived private R2 photo preview, approval checklists and audit history.
- Photo queue: review current uploaded photos, approve/reject with reason.
- Account review: **explicit APPROVE/REJECT** actions, with mandatory reasons
  on rejection. Actions are enforced on the server and write an audit record.
- Audit activity: recent photo and account review decisions.

### Approval requirements
Account approval may only be issued when:
1. Didit identity status is Approved
2. Verified government-ID date of birth equals registered DOB and proves 18+
3. Required profile fields are completed
4. Profile photograph has been reviewed and Approved

An approval by a different moderator sets
`User.adminApprovalStatus=APPROVED` and reconciles the account status to
`ACTIVE` only if all the above remain satisfied. Rejected approvals leave
the account pending/non-discoverable. Changes to a profile or photo reset the
approval to `PENDING`. The new
`AccountModerationDecision` table records decisions with reviewer, timestamp,
decision and optional reason. Suspended and deleted accounts are never activated.
The app has **no client-side bypass**.

## Additive database migration

Apply `server/prisma/migrations/20261024_admin_crm_approvals/migration.sql`
**only to a staging Neon branch first**. The migration adds
`User.adminApprovalStatus` and `AccountModerationDecision`. It does not
overwrite existing member records. Backup prior to any production migration.

The repository still lacks the original initial migration file
`20261024111839_data`; recover that before using Prisma migrate dev on fresh
databases. Never run `migrate reset` on populated Neon.

## Current limitations

- CRM is a code-complete initial admin UI, not yet production deployed.
- Didit age-evidence mapping must be checked against real sandbox responses;
  a provider-approved session without extracted DOB stays blocked.
- Profile photo scanning and moderation SOP/appeals are not yet finished.
- Existing Expo dependency security audit findings block release.
- React admin uses a login response bearer token, memory-only. Harden with
  MFA, same-site admin-only session cookies/CSRF, and least-privilege RBAC
  before any public exposure.
