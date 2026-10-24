import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { VerificationModule } from './modules/verification/verification.module';
import { PhotosModule } from './modules/photos/photos.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ModerationModule } from './modules/moderation/moderation.module';

@Module({
  imports: [PrismaModule, AuthModule, ProfilesModule, PreferencesModule, VerificationModule, PhotosModule, LocationsModule, ModerationModule],
  controllers: [HealthController],
})
export class AppModule {}
