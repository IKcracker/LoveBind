import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AllowSuspended, AuthGuard, AuthenticatedRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @UseGuards(AuthGuard)
  @AllowSuspended()
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.authUserId);
  }

  @UseGuards(AuthGuard)
  @AllowSuspended()
  @Post('logout')
  logout(@Req() request: AuthenticatedRequest) {
    return this.auth.logout(request.authToken);
  }
}
