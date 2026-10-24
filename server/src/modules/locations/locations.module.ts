import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { AuthModule } from '../auth/auth.module';
@Module({imports:[AuthModule],controllers:[LocationsController]})
export class LocationsModule {}
