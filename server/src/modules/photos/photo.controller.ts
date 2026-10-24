import { BadRequestException, Controller, Get, Post, Body, Req, ServiceUnavailableException, UseGuards, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

export function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new ServiceUnavailableException('Private profile photo storage is not configured');
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: 'https://' + R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });
  return { client, bucket: R2_BUCKET };
}

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

@Controller('photos')
@UseGuards(AuthGuard)
export class PhotoController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upload-request')
  async request(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    if (!imageTypes.has(String(input.contentType)) ||
        typeof input.size !== 'number' || !Number.isInteger(input.size) ||
        input.size < 1024 || input.size > MAX_BYTES) {
      throw new BadRequestException('Choose a JPEG, PNG or WebP photo smaller than 5 MB');
    }
    const { client, bucket } = storage();
    const key = 'profiles/' + req.authUserId + '/' + randomUUID();
    const contentType = input.contentType as string;
    const url = await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket, Key: key, ContentType: contentType, ContentLength: input.size,
    }), { expiresIn: 300 });
    return { uploadUrl: url, key, contentType, maxBytes: MAX_BYTES };
  }

  @Post('confirm')
  async confirm(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const key = input.key;
    if (typeof key !== 'string' || !/^profiles\/[a-z0-9_-]+\/[0-9a-f-]{36}$/i.test(key) ||
        !key.startsWith('profiles/' + req.authUserId + '/')) {
      throw new BadRequestException('Invalid profile photo');
    }
    const { client, bucket } = storage();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch(() => { throw new NotFoundException('Uploaded photo was not found'); });
    if (!object.ContentLength || object.ContentLength > MAX_BYTES || !imageTypes.has(object.ContentType ?? '')) {
      throw new BadRequestException('Uploaded file does not meet photo requirements');
    }
    await this.prisma.profile.update({
      where: { userId: req.authUserId },
      data: { photoObjectKey: key, photoReviewStatus: 'PENDING' },
    });
    return { status: 'PENDING' };
  }

  @Get('me')
  async get(@Req() req: AuthenticatedRequest) {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { userId: req.authUserId },
      select: { photoObjectKey: true, photoReviewStatus: true },
    });
    if (!profile.photoObjectKey) return { url: null, status: profile.photoReviewStatus };
    const { client, bucket } = storage();
    const url = await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket, Key: profile.photoObjectKey,
    }), { expiresIn: 120 });
    return { url, status: profile.photoReviewStatus };
  }
}
