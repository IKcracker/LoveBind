import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest, AllowSuspended } from '../auth/auth.guard';
import { AccountDeletionService } from './account-deletion.service';

@Controller('account')
@UseGuards(AuthGuard)
export class AccountDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @AllowSuspended()
  @Post('delete')
  remove(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.deletion.remove(req.authUserId, req.authToken, body);
  }
}
