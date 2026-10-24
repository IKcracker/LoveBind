# LoveBind: mobile app cannot reach the backend

1. In the repository root, create `.env.local` containing `EXPO_PUBLIC_API_URL=auto`.
2. Start the API in Terminal 1: `cd server && npm install && npm run prisma:generate && npm run dev`.
3. On the computer, visit `http://localhost:4000/health` and `http://localhost:4000/health/ready`. Both should return `status: ok` before registration can work.
4. Start Expo from the repository root in Terminal 2: `npx expo start -c --lan`.
5. On physical devices, the phone and laptop must be on the same Wi-Fi, port 4000 must be allowed in Windows Defender Firewall, and the LAN IP must be reachable. If Expo uses a tunnel or auto-detection fails, run `ipconfig` on the laptop and set `EXPO_PUBLIC_API_URL=http://<YOUR_IPV4>:4000` (replace the placeholder with the actual address). Restart Expo with `-c` after changing .env.local.
6. For Android emulator, `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` is available. iOS Simulator on a Mac can use `http://localhost:4000`. Web on the PC can use `http://localhost:4000`.
7. The registration screen has a **development-only API status panel** showing the URL and readiness check. It is hidden in release builds.
8. A database connection is not enough: Prisma models must exist. For fresh development databases, review schema and run `npm run prisma:migrate -- --name init` using a **direct Neon connection** (non-pooler URL). Never run a destructive migration against production or an existing database without reviewing it.

The API binds to 0.0.0.0 on port 4000. On web, ensure the browser origin is in `CORS_ORIGINS` in `server/.env.local`. Mobile native requests do not use browser CORS. The development-only HTTP access is not appropriate for a production release: production must use HTTPS. Never put `DATABASE_URL` in Expo's .env.local or public variables.
