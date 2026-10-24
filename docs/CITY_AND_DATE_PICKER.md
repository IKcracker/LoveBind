# Verified City Autocomplete + Date of Birth Picker

## City suggestions

The onboarding and profile-editor city field uses Google's Places API (New) behind the authenticated NestJS backend. No Google API key is shipped in Expo.

1. Create a Google Cloud project; enable **Places API (New)** and billing.
2. Create and restrict an API key to **Places API (New)**. Apply server/API request restrictions appropriate for the Render backend. Do not use an unrestricted key.
3. Set `GOOGLE_PLACES_API_KEY` in **Render's server Environment**. Do not put it in Expo's EXPO_PUBLIC variables.
4. Apply the additive migration `20261024_city_place_id` to a staging Neon branch. Do not use `migrate reset`.
5. Deploy the backend feature branch to **staging**; the main API does not yet expose these routes.
6. In Expo, type at least three characters; pick one of the suggested cities. The selected place ID is validated again on the server. A typed-but-unselected city cannot be saved as a new location.

API routes (Bearer auth):
- `GET /locations/cities?q=Pretoria` returns up to six candidate cities (place ID and label).
- `GET /locations/place?id=...` verifies a place is a city and returns the canonical name/ID.
- `PUT /profiles/me` saves `city` plus `cityPlaceId` after server-side validation.

**Privacy:** These are city-level suggestions, not street addresses. No device GPS permission is required, and no precise location is collected. Other users must not receive raw place IDs or coordinates until discovery privacy requirements are defined.

## Birth date

Registration now uses a native date picker on Android/iOS and the browser's built-in HTML date picker on web. Both emit YYYY-MM-DD. The API remains the authoritative 18+ validator; the interface does not allow selecting dates newer than 18 years ago. Identity verification will later confirm the age independently.

## Testing

- Type `Pre` and verify Pretoria appears; select a suggestion and submit onboarding.
- Change the city after selecting it and ensure a new suggestion must be selected.
- Verify server denies a changed city submitted without a place ID.
- Verify 18th-birthday eligibility, leap days, and timezone edge cases.
- Test on physical Android/iOS, including the native date picker.
- Existing profiles with legacy plain-text cities can retain them until the user changes the city.
