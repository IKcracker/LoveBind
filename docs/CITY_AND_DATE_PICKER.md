# GeoNames city autocomplete (no Google key)

LoveBind uses the openly licensed GeoNames city catalog, imported once into the existing Neon PostgreSQL database. The app sends city search text to the authenticated LoveBind API. It never requests a device's GPS or street address.

## Import the catalogue

1. Apply the additive `20261024_geonames_city_catalog` migration to a staging Neon branch.
2. Download `cities1000.zip` from https://download.geonames.org/export/dump/cities1000.zip . Review the GeoNames license at https://www.geonames.org/about.html .
3. Extract `cities1000.txt` locally, then from the server directory run:

```powershell
node scripts/import-geonames.cjs "C:\\path\\to\\cities1000.txt"
```

The import uses the configured `DATABASE_URL` and safely upserts city rows. Large imports may require a direct Neon connection. Do not import on production until staging is tested.

## APIs

Authenticated routes remain compatible with the Expo CityPicker:

- GET /locations/cities?q=Pre returns a city list with GeoNames identifiers.
- GET /locations/place?id=geonames:12345 resolves the selection from the local catalogue.
- PUT /profiles/me validates and stores city/cityPlaceId against that same catalogue.

Users cannot submit invented or unchecked cities. Legacy free-text cities stay unchanged until they are edited.

Attribution: Geographic city data © GeoNames contributors, licensed CC BY 4.0. Include visible GeoNames attribution in the app's location-search UI and legal notices.

No GOOGLE_PLACES_API_KEY is required. Date-of-birth picker is unaffected.
