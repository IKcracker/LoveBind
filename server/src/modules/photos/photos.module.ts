import { Module } from '@nestjs/common';
import { PhotoController } from './photo.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], controllers: [PhotoController] })
export class PhotosModule {}
