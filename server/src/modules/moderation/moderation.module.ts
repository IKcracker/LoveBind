import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModerationController } from './moderation.controller';
@Module({ imports: [AuthModule], controllers: [ModerationController] })
export class ModerationModule {}
