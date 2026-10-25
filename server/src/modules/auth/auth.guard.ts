import { SetMetadata, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { tokenDigest } from './auth.service';

export const AllowSuspended = () => SetMetadata('allowSuspended', true);

export type AuthenticatedRequest = Request & { authUserId: string; authToken: string };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization') ?? '';
    if (!/^Bearer [A-Za-z0-9_-]{40,100}$/.test(authorization)) {
      throw new UnauthorizedException('Authentication required');
    }
    const token = authorization.slice(7);
    const session = await this.prisma.authSession.findUnique({
      where: { tokenDigest: tokenDigest(token) },
      include: { user: { select: { id: true, status: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() ||
        (session.user.status === 'SUSPENDED' && !Reflect.getMetadata('allowSuspended', context.getHandler())) || session.user.status === 'DELETED') {
      throw new UnauthorizedException('Session expired or account unavailable');
    }
    request.authUserId = session.user.id;
    request.authToken = token;
    return true;
  }
}
