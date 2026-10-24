import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PreferencesModule } from './modules/preferences/preferences.module';

@Module({
  imports: [PrismaModule, AuthModule, ProfilesModule, PreferencesModule],
  controllers: [HealthController],
})
export class AppModule {}
