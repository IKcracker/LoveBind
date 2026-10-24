import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModerationController } from './moderation.controller';
import { AdminController } from './admin.controller';
import { AgeRecheckService } from './age-recheck.service';
@Module({ imports: [AuthModule], controllers: [ModerationController, AdminController], providers: [AgeRecheckService] })
export class ModerationModule {}
