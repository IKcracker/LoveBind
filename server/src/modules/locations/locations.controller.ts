import { BadGatewayException, BadRequestException, Controller, Get, Query, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

type Prediction = { placePrediction?: { placeId?: string; text?: { text?: string }; types?: string[] } };
type AutocompleteResult = { suggestions?: Prediction[] };
type PlaceDetails = { id?: string; displayName?: {text?: string}; formattedAddress?: string; types?: string[] };

const CITY_TYPES = new Set(['locality','postal_town','administrative_area_level_3','administrative_area_level_2']);

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationsController {
  private key() {
    if (!process.env.GOOGLE_PLACES_API_KEY) throw new ServiceUnavailableException('City suggestions are not configured');
    return process.env.GOOGLE_PLACES_API_KEY;
  }

  @Get('cities')
  async cities(@Query('q') query?: string) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 3 || q.length > 80) throw new BadRequestException('Search must be 3-80 characters');
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.key() },
      body: JSON.stringify({ input: q, includedPrimaryTypes: ['(cities)'], languageCode:'en', regionCode: 'ZA', includeQueryPredictions: false }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => { throw new BadGatewayException('City search unavailable'); });
    if (!response.ok) throw new BadGatewayException('Unable to retrieve city suggestions');
    const result = await response.json() as AutocompleteResult;
    return (result.suggestions ?? []).map(s => s.placePrediction).filter((x): x is NonNullable<Prediction['placePrediction']> =>
      !!x?.placeId && !!x.text?.text).slice(0,6).map(p => ({ placeId:p.placeId, label:p.text!.text }));
  }

  @Get('place')
  async place(@Query('id') id?: string) {
    if (!id || id.length > 255 || !/^[\w:-]+$/.test(id)) throw new BadRequestException('Invalid place ID');
    const response = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id), {
      headers: { 'X-Goog-Api-Key': this.key(), 'X-Goog-FieldMask': 'id,displayName,formattedAddress,types' },
      signal: AbortSignal.timeout(8000),
    }).catch(() => { throw new BadGatewayException('Place details unavailable'); });
    if (!response.ok) throw new BadGatewayException('Could not verify city selection');
    const p = await response.json() as PlaceDetails;
    if (p.id !== id || !(p.types ?? []).some(t => CITY_TYPES.has(t))) throw new BadRequestException('Please select a city from suggestions');
    const city = p.displayName?.text?.trim();
    if (!city || city.length > 100) throw new BadRequestException('Invalid city');
    return { placeId: p.id, city, label: p.formattedAddress ?? city };
  }
}
