import { AccountDeletionService } from '../account-deletion/account-deletion.service';
import { AccountDeletionController } from '../account-deletion/account-deletion.controller';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, AccountDeletionController],
  providers: [AuthService, AuthGuard, AccountDeletionService],
  exports: [AuthGuard],
})
export class AuthModule {}
