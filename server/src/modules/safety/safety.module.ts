import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SafetyController } from './safety.controller';
@Module({ imports: [AuthModule], controllers: [SafetyController] })
export class SafetyModule {}
