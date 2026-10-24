# Profile pictures and richer onboarding

The onboarding branch adds an editorial three-stage process:
1. About you: city, relationship goal, optional occupation, interests, values, introduction
2. Profile photo: choose/crop a JPG, PNG or WebP image (5 MB maximum)
3. Identity verification: hosted Didit session. **Identity photos do not become profile photos.**

## Private Cloudflare R2 staging setup

Create an R2 bucket with **public access disabled**. Create an API token scoped only to this bucket with object read/write permissions. In the backend Render service (not the mobile app), set:

```dotenv
R2_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
R2_BUCKET=YOUR_PRIVATE_BUCKET
R2_ACCESS_KEY_ID=YOUR_R2_KEY_ID
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET
```

Configure R2 CORS to permit browser-origin `PUT` with `Content-Type` and necessary preflight headers from your *actual* Expo web origins. Native mobile requests do not use browser CORS.

The API issues a **5-minute signed upload URL**, constrained to a user-specific key. On confirmation it checks the private object exists and is within the size/type policy, and marks it **PENDING**. The only download URL is a short-lived signed link available to the authenticated owner at `GET /photos/me`.

**Important restrictions:** No user-to-user discovery endpoints expose pending photos. Provider ID documents never enter R2. A moderation queue and malware/content scanning are still required before any photos can become visible. The API currently permits only one primary photo; multiple photos and deletion are follow-up work.

## Database migration

The new migration is `20261024_profile_details_and_photo`. Apply it only to an isolated Neon staging branch first. Existing registration data must be preserved. The source repository still lacks the original migration file `20261024111839_data`; recover it from your original computer before using `prisma migrate dev` on a fresh environment. Never use `migrate reset` on the populated Neon project.

## Device development

From the root:

```powershell
npm install
npx expo start -c
```

To use image-picker on a custom dev build, rebuild the native app after installing this native Expo module. Verify mobile-photo PUT behavior against a private test bucket on both platforms. Do not mark CI as passing before running type checks and real upload tests.
