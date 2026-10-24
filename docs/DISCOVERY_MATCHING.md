# LoveBind – Discover, Matches & Conversations (development milestone)

## Status
This is a private-development feature on `feat/discovery-matches-messaging`.
It uses the existing Prisma `User`, `Profile`, `Like`, `Match`,
`Conversation`, `Message`, `Block`, and `SafetyReport` models.
No new migration is required for this feature.

## Mobile screens
- `/explore`: polished discovery cards with photo, age, city, shared interests
  and values, send like, skip locally, block, and report. Empty and loading
  states are included. Mutual likes show a match dialog with a chat shortcut.
- `/matches`: private matches inbox, loading/empty/locked states.
- `/conversations/[matchId]`: messages between matched users only, manual
  refresh, message input, match blocking, and safe empty state.
- `/`: member home links to Discover and Matches and retains onboarding
  shortcuts. Bottom navigation includes Home, Discover, Matches, Profile.

## Backend API – authenticated
- `GET /social/access`: identifies missing eligibility requirements without
  exposing any other account data.
- `PUT /social/visibility {visible:boolean}`: defaults private; enabling
  requires approved eligibility.
- `GET /social/discover`: returns up to 12 candidate summaries (never
  credentials/identity numbers). Excludes blocked/previously liked users and
  applies selected age, city, and relationship-goal preferences.
- `POST /social/likes {toId}`: records a like and creates a match and
  conversation on reciprocal likes.
- `GET /social/matches`: returns the authenticated user's matches only.
- `GET /social/matches/:matchId/messages`: authenticated participant only.
- `POST /social/matches/:matchId/messages {content}`: authenticated
  participant only. Max 1,500 characters; basic 2.5-second cooldown.
- `POST /social/blocks {memberId}`: blocks a user and closes any match.
- `POST /social/reports {memberId,category,details?}`: safety report.

## Non-negotiable public safety gate
Before someone can see real candidate photos or send likes or messages, the
server requires:
- User.status = ACTIVE
- Didit `IdentityVerification.status` = Approved
- A profile with city, bio, and relationship intention
- A reviewed profile photo with `photoReviewStatus = APPROVED`
- Age at least 18 (in addition to future provider age evidence)
- `Profile.isVisible=true` explicitly opted into by the member

The current app does NOT automatically switch pending accounts to ACTIVE or
approve their photos. The account remains private while Didit credits or
photo moderation are unavailable. Do not set status fields manually for real
people to bypass verification. The only synthetic approvals are applied by
`server/scripts/integration-smoke.cjs` in disposable test databases.

## Verification
```bash
cd server
npm run typecheck
npm test
npm run build
cd ..
npm run typecheck
npm run lint
npx expo export --platform android --output-dir dist-ci/android
npx expo export --platform ios --output-dir dist-ci/ios
```

GitHub CI also runs an isolated PostgreSQL HTTP integration test covering
registration, secure discovery gating, discovery with *synthetic approved
accounts*, reciprocal likes, messaging, reports and blocking.

## Known limitations, not ready for public launch
- Didit credit balance and verification acceptance still pending.
- Profile-photo moderation and verification audit trail must be implemented.
- "Not now" hides a profile only until the list is refreshed. Persisted passes
  are a follow-up task.
- Chat uses manual refresh, not realtime delivery, notifications, or read receipts.
- No message abuse detection, substantial server-side per-user rate limits,
  moderation queue handling, appeals, or account deletion workflows yet.
- Matching is rule-based filtering only, not a compatibility model.
- Discover currently reads a bounded pool of up to 120 candidates, then
  displays at most 12; implement cursor pagination and query-based age
  filtering before scaling.
- The first Prisma migration file remains missing from the repository;
  recover the original baseline for fresh installs. Never reset live Neon.
- Resolve dependency audit findings and pass CI before merging to main.
