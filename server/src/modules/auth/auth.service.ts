import {
  ConflictException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';
import { parseLogin, parseRegistration } from './auth.validation';

export function tokenDigest(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async issueSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await this.prisma.authSession.create({
      data: { userId, tokenDigest: tokenDigest(token), expiresAt },
    });
    return { accessToken: token, tokenType: 'Bearer' as const, expiresAt: expiresAt.toISOString() };
  }

  async register(input: unknown) {
    const fields = parseRegistration(input);
    const passwordHash = await hashPassword(fields.password);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          authSubject: randomUUID(),
          status: 'PENDING',
          credential: { create: { email: fields.email, passwordHash } },
          profile: { create: { displayName: fields.displayName, birthDate: fields.birthDate } },
        },
        select: { id: true, status: true },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('An account already exists for this email');
      }
      throw error;
    }
    return { ...(await this.issueSession(user.id)), user: { id: user.id, status: user.status } };
  }

  async login(input: unknown) {
    const { email, password } = parseLogin(input);
    const credential = await this.prisma.emailCredential.findUnique({
      where: { email }, include: { user: { select: { id: true, status: true } } },
    });
    // Use identical public errors whether email exists or password is wrong.
    if (!credential || !(await verifyPassword(password, credential.passwordHash)) ||
        credential.user.status === 'DELETED' || credential.user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid credentials or account unavailable');
    }
    return {
      ...(await this.issueSession(credential.user.id)),
      user: { id: credential.user.id, status: credential.user.status },
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, status: true, createdAt: true,
        credential: { select: { email: true } },
        profile: { select: {
          displayName: true, birthDate: true, bio: true, city: true,
          relationshipGoal: true, occupation: true, interests: true, coreValues: true, photoReviewStatus: true, isVisible: true,
        } },
        preferences: { select: { minAge: true, maxAge: true, preferredCities: true, relationshipGoals: true } },
      },
    });
  }

  async logout(token: string) {
    await this.prisma.authSession.updateMany({
      where: { tokenDigest: tokenDigest(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
