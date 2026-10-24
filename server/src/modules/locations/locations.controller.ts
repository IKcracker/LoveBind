import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('cities')
  async cities(@Query('q') input?: string) {
    const query = typeof input === 'string' ? input.trim() : '';
    if (query.length < 3 || query.length > 80) throw new BadRequestException('Search must be 3-80 characters');
    const prefix = query.toLowerCase().replace(/[\\%_]/g,'');
    const matches = await this.prisma.$queryRaw<Array<{
      id: number; name: string; countryCode: string; population: number
    }>>`
      SELECT "id","name","countryCode","population"
      FROM "GeoCity"
      WHERE lower("name") LIKE ${prefix + '%'} OR lower("asciiName") LIKE ${prefix + '%'}
      ORDER BY CASE WHEN "countryCode" = 'ZA' THEN 0 ELSE 1 END,
               "population" DESC, "name" ASC
      LIMIT 6
    `;
    return matches.map(city => ({
      placeId: 'geonames:' + city.id,
      label: city.name + ', ' + city.countryCode,
    }));
  }

  @Get('place')
  async place(@Query('id') id?: string) {
    if (!id || !/^geonames:[1-9][0-9]{0,9}$/.test(id)) {
      throw new BadRequestException('Invalid city identifier');
    }
    const city = await this.prisma.geoCity.findUnique({
      where: { id: Number(id.slice('geonames:'.length)) },
    });
    if (!city) throw new BadRequestException('Select a city from suggestions');
    return { placeId: 'geonames:' + city.id, city: city.name, label: city.name + ', ' + city.countryCode };
  }
}
