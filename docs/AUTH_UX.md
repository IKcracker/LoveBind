# LoveBind — welcome and authentication UX

## What this feature adds

The unauthenticated root route is now a **welcome / landing screen** with a clear product promise, a lightweight illustration drawn with React Native views (no stock photography or unlicensed assets), three-step explanation, and two working calls to action.

Existing signed-in users see their protected account home, profile and preferences.

The sign-in and sign-up routes share a coherent mobile-first design system: LoveBind plum/rose/cream, form layout, accessible inputs, inline validation, loading/error states, password visibility toggle, and responsive scrolling/keyboard avoidance.

## API integration

- Registration still posts to `POST /auth/register`.
- Login still posts to `POST /auth/login`.
- Tokens are never logged, and the existing session provider stores them via SecureStore on native.
- A production build refuses an insecure HTTP base URL.
- Two simultaneous submits are blocked by loading state.

## Current limitations (must resolve before public launch)

- Age is self-declared, not verified. Accounts remain `PENDING`.
- No email verification, password reset, bot mitigation or backend request rate-limiting has been implemented.
- Terms of Service, Privacy Policy, consent-recording flow, account deletion and adult verification need implementation and legal review.
- No live discovery, chat, quiz or payment features are represented as available.
- These screens should not be labeled production-launched until the blocking backend, legal and CI/device tests pass.

## QA checks

- Unauthenticated cold launch shows Welcome, and both CTAs navigate correctly.
- Sign in and sign up offer back navigation to the welcome screen.
- Invalid email, blank password, underage / malformed birth dates, mismatched passwords, unchecked age affirmation and network timeouts show clear errors.
- Create a user against the development API, verify `/auth/me`, then reopen the application and verify session restoration on Android and iOS.
- Network failure must not display a false success or crash; concurrent taps should not double-submit.
- Test compact and large screens, screen reader focus/labels, keyboard avoidance and system font scaling.
- Run `npm run lint`, `npm run typecheck`, Expo SDK consistency checks and iOS/Android JS export; perform on-device smoke tests.
- Ensure API and Neon passwords are never added to Expo public environment variables or source.
