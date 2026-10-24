# Hosting the LoveBind NestJS API on Render

The repository root is an **Expo React Native application**, not the web-server backend.
The NestJS API lives under `server/`.

## Repair an existing manually created Render web service

In Render > your LoveBind service > Settings > Build & Deploy, set:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | main |
| Root Directory | server |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/health` |

In Environment, set `DATABASE_URL` to a **rotated** Neon connection string.
Set `NODE_VERSION=22` (Render defaults to Node 24 for recently created services).
Set `CORS_ORIGINS` to the exact web-origin(s) you plan to allow, separated by commas.
Do **not** put the PostgreSQL URL into the Expo application's `EXPO_PUBLIC_` variables.

Save settings and select **Manual Deploy > Deploy latest commit**.

The Render dashboard's build and start commands override the source repository's
documentation. Adding `render.yaml` does not automatically update an existing
manually configured web service. The Blueprint is for creating/managing services
through Render's Blueprint workflow.

## How to verify

- `https://YOUR-SERVICE.onrender.com/health` must return `{"status":"ok","service":"lovebind-api"}`.
- `https://YOUR-SERVICE.onrender.com/health/db` must return `{"status":"ok"}` when connected to Neon.
- `https://YOUR-SERVICE.onrender.com/health/ready` must return `{"status":"ok"}` only after all registration tables are present.

An HTTP 200 response from `/health` does **not** prove that registration will work.
Apply and review the initial Prisma schema changes against an isolated development
Neon branch before allowing testers to sign up. Do not automatically run destructive
migrations as part of web-service startup.

To connect Expo to the hosted API, set the **root** `.env.local` to
`EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com` and restart
`npx expo start -c`. The root .env.local is public client configuration; it
must never contain `DATABASE_URL`, authentication secrets or OpenAI API keys.

## Important staging restrictions

The current API does **not** have email verification, trusted age verification,
request throttling, abuse prevention, password recovery, consent/legal controls
or public-launch protections. Treat hosting as **development/staging only**.
Do not distribute sign-up access to real users until those controls and CI security
checks pass.

### Why the previous deploy failed

`node expo-router/entry` is a mobile Expo entrypoint, not a server process. A
build command of only `npm install` also fails to compile NestJS to `dist/`.
Use the root directory and commands shown above.
