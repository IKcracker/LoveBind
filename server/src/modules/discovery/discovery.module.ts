import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryController } from './discovery.controller';
@Module({ imports: [AuthModule], controllers: [DiscoveryController] })
export class DiscoveryModule {}
