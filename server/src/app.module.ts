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
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { SafetyModule } from './modules/safety/safety.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';

@Module({
  imports: [PrismaModule, AuthModule, ProfilesModule, PreferencesModule, VerificationModule, PhotosModule, LocationsModule, ModerationModule, DiscoveryModule, SafetyModule, ConversationsModule, QuizzesModule],
  controllers: [HealthController],
})
export class AppModule {}
