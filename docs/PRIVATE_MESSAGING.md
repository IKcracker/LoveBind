# Private messaging delivery and CI

## What is implemented
- Only two members of a currently active mutual Match can fetch or send its messages. Both accounts must still be active, approved, adult-age verified and photo approved. Blocked or unmatched pairs receive 404.
- GET /conversations/:matchId/messages returns at most 30 chronological messages. `nextCursor` is the next older page; callers cannot use another conversation's cursor.
- POST /conversations/:matchId/messages accepts non-empty text up to 1,500 characters. PostgreSQL-backed throttles limit one message per 1.5 seconds and 20 per minute per sender/conversation. Pairwise transaction locks coordinate with blocking/unmatching.
- All **new** messages use AES-256-GCM ciphertext at rest in `Message.content`. The API returns plaintext only to authorized participants; database queries and application logs must not expose it. The backend does not generate encryption keys.
- Matches link to a chat screen, with manual older-history pagination and a safety action for blocking/reporting.

## Deploy
1. In Render > LoveBind API > Environment, set `LOVEBIND_CHAT_ENCRYPTION_KEY` to a **unique 64-character hex key** produced with `openssl rand -hex 32`. Never put this in Expo, `EXPO_PUBLIC_*`, GitHub or CRM Vite settings.
2. Back the key up to a managed secret vault. Losing it makes ciphertext unreadable. Rotating it requires re-encryption; do not casually replace a live key.
3. Deploy the server and mobile build from the same passing revision. No additional database migration is required for this messaging slice: the existing Message, Match and Conversation tables are reused.
4. Test with two synthetic fully approved adult accounts on a disposable staging database. Do not fabricate Didit approvals for real users.
5. Manual device QA: open Matches, enter chat, send/read, reload, load older history, block or unmatch and confirm both sides lose access.

## Security and operational limitations
- Encryption at rest is **not end-to-end encryption**: the server decrypts for the authorized recipients.
- Chat is currently pull-to-refresh/on-entry, not WebSocket live or push notifications. The refresh action is explicit; do not claim real-time delivery.
- Reports and blocks remain available, but proactive chat content abuse detection, account deletion, retention/export, key rotation and legal/privacy review still require production work.
- The `node-forge` upstream advisory **GHSA-86w9-cpqp-85rv** remains unresolved in Expo's build-tool dependency chain. CI applies a narrowly scoped exception expiring 2026-11-24 and continues blocking all other high/critical reports. This is a documented risk acceptance, **not a patched vulnerability**. An updated patched dependency should replace the exception. Never use `npm audit fix --force` if it downgrades Expo.
- The Git link directory scanner now skips non-regular tracked objects and continues checking all tracked regular files.

## Tests
The mandatory CI runs API unit tests (crypto randomization, tamper rejection, missing key), mobile typecheck/lint/bundle, real temporary PostgreSQL integration (two authorized participants, stranger/admin denied, anti-spam, encrypted storage, pagination and block revocation), tracked-file secret scan and dependency audit.
