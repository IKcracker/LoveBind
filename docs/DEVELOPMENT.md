# LoveBind development foundation

This repository began as an Expo SDK 58 mobile starter. The mobile app remains at the repository root. A **separate NestJS API** has been scaffolded under `server/` with Prisma / PostgreSQL and an isolated mutual-compatibility scoring module.

## Local setup

1. Run `npm ci` in the repository root for the Expo application.
2. In `server/`, run `npm install` to generate a server lockfile.
3. Copy `server/.env.example` to `server/.env`. Insert a **rotated development-only** Neon connection string. Do not commit it.
4. Run `npm run prisma:generate` and `npm run prisma:validate` from `server/`.
5. Review the Prisma schema and generate a migration with `npx prisma migrate dev --name init` only when ready to modify the development database.
6. Start API with `npm run dev`; check `GET /health` and `GET /health/db`.
7. Run `npm run typecheck` and `npm test` in `server/`; use `npx expo lint` and `npx tsc --noEmit` for mobile.

## Security and architecture rules

- Never put PostgreSQL, OpenAI, auth, payment or encryption secrets in Expo `EXPO_PUBLIC_*` variables or source code.
- Mobile talks to NestJS; only backend connects to Neon. Distinct development and production Neon projects are required.
- The schema is a **starting point** and has not been migrated. There is no functioning auth, matchmaking, chat, billing or AI integration yet.
- The compatibility calculator takes **validated** per-category scores. It does not call an LLM and does not predict real-world relationship success.
- The lowest category is exploratory, not a safety refusal. Eligibility, consent and blocking are separate requirements.
- Enforce that match participants are distinct, sorted deterministically, and actually authorized; ensure like/block operations disallow self-interaction.
- Encrypt quiz responses using a dedicated managed key before insertion; do not write plaintext responses in the ciphertext column.
- Wallet mutations must be atomic, idempotent and protected against overdrafts and concurrency. Ledger is append-only.
- Never charge for an unaccepted date request. Store a server-side quote and release reservations when declined or expired.
- Real data cannot be collected until age verification, moderation, privacy consent, deletion and access controls are implemented.
- Do not treat these files as production-ready or claim tests succeeded unless actually executed.

## Next vertical slice

Build secure authentication and profiles first, using tests and strict server-side authorization, then implement mutual likes, chat, versioned quizzes, and AI assessments. Billing and date bookings follow once the earlier steps are tested.
