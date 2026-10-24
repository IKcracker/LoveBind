import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export function validateOtherMember(me: string, id: string) {
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(id) || id === me) throw new BadRequestException('Invalid member');
}

export async function lockMemberPair(tx: Prisma.TransactionClient, first: string, second: string) {
  // All pair mutations use the same transaction lock, including simultaneous
  // reciprocal likes and blocking, so a blocked pair cannot race into a match.
  const key = [first, second].sort().join(':');
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
