import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModerationController } from './moderation.controller';
import { AdminController } from './admin.controller';
@Module({ imports: [AuthModule], controllers: [ModerationController, AdminController] })
export class ModerationModule {}
