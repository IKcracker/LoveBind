import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  status(): { status: string; service: string } {
    return { status: 'ok', service: 'lovebind-api' };
  }

  @Get('db')
  async database(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  @Get('ready')
  async readiness(): Promise<{ status: string }> {
    let tables: { users: string | null; credentials: string | null; sessions: string | null }[];
    try {
      tables = await this.prisma.$queryRaw<
        { users: string | null; credentials: string | null; sessions: string | null }[]
      >`SELECT to_regclass('public."User"')::text AS users,
               to_regclass('public."EmailCredential"')::text AS credentials,
               to_regclass('public."AuthSession"')::text AS sessions`;
    } catch {
      throw new ServiceUnavailableException('PostgreSQL is unavailable');
    }
    if (!tables[0]?.users || !tables[0]?.credentials || !tables[0]?.sessions) {
      throw new ServiceUnavailableException('Development database schema not initialized');
    }
    return { status: 'ok' };
  }
}
