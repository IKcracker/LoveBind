# LoveBind authentication and onboarding — implementation notes

The API now defines registration, login, logout, GET /auth/me, GET/PUT /profiles/me and GET/PUT /preferences/me. All profile and preferences reads and writes require a bearer session and use the authenticated user's ID.

## Register request
POST /auth/register with JSON: { "email":"alex@example.com", "password":"12+characters", "displayName":"Alex", "birthDate":"2000-05-12" }.

## Login request
POST /auth/login with JSON: { "email":"alex@example.com", "password":"..." }.

Responses to register/login include an opaque bearer token (7-day expiry), an ISO expiry and limited user information. The mobile client should store bearer tokens using Expo SecureStore (not EXPO_PUBLIC variables, AsyncStorage, or log output) and clear them on logout.

GET /auth/me confirms session status and returns profile and preferences. PUT /profiles/me accepts optional displayName, city, bio and relationshipGoal. PUT /preferences/me requires minAge, maxAge, preferredCities and relationshipGoals.

## Important limitations and launch blockers
- **Registration is not identity or age verification.** Birthdate entry provides only a self-declared age gate. Accounts remain PENDING until a future trusted verification process is implemented.
- No email verification, password reset, brute-force throttling, CAPTCHA, password breach detection, or user deletion exists yet. **Do not expose these endpoints publicly** before those safeguards are implemented.
- Endpoint implementations have not been built or tested in a checked-out repository. No migrations were applied and no Neon database changes were made.
- Never deploy a credentials-enabled CORS API to the public internet without tightening allowed origins.
- Phone devices need a reachable HTTPS backend. Never embed the Neon connection string, OpenAI key or database passwords in Expo client code.
- Add consent capture, account deletion and full privacy review before accepting actual user personal data.
- Rotate the previously shared development Neon password and store only in server/.env.
