# LoveBind Expo authentication and profile implementation

## Routes

- `/`: protected onboarding home and current account status
- `/login`: email/password login
- `/register`: adult self-declaration, account registration
- `/profile`: authenticated profile update
- `/preferences`: authenticated partner preference update

All requests are sent through `src/lib/api.ts` to `EXPO_PUBLIC_API_URL`. Login and registration issue a server session token, stored in Expo SecureStore on supported native devices. Web sessions are **memory only** and disappear on reload. Native session restoration checks `GET /auth/me` before showing protected pages. Profile access is authorized on the server, not just through route redirects.

## Required setup

1. Run `npx expo install expo-secure-store` at the repository root. **Commit the generated package-lock.json.** The package.json dependency version is provisional until Expo checks the SDK 58-compatible package version.
2. Run `npm install` under `server/` and commit `server/package-lock.json`.
3. Copy `.env.example` to `.env.local` (ignored), and set `EXPO_PUBLIC_API_URL` to a reachable HTTPS API hostname; for Android emulators in local development, a reachable emulator host may be used. `localhost` on a physical device refers to the phone, not the computer.
4. Rotate the development Neon password, then configure `server/.env` locally. Do not add database credentials or OpenAI keys to Expo variables.
5. Validate the Prisma schema, generate and review migrations before applying them to dev Neon.
6. Run `npx expo install --check`, `npx expo-doctor`, `npx expo lint`, `npx tsc --noEmit`, and test real registration/login on Android/iOS.
7. The SecureStore native module requires a development build where not included in Expo Go.

## Limitations / security blockers

- This is a pre-release onboarding UI. No actual email verification or trusted age/identity verification exists; all accounts remain PENDING and profiles remain hidden.
- Do not expose account creation to real users until verification, rate limits, anti-bot controls, email confirmation, deletion and privacy consent are implemented.
- Logout clears the local session even when the server is unreachable. A logout failure during lost connectivity may leave the server session valid until its expiry. Add server-side session revocation/recovery.
- No password reset, rate limiting, password-breach checks, active session management, discovery, chat, quiz, matchmaking or billing yet.
- Never log bearer tokens or store them in AsyncStorage, localStorage or public environment variables.
- Source was committed through GitHub connector without executing npm build, tests or iOS/Android builds. Dependencies are not yet installed/locked in the server workspace.
