import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';
import { parseEmail, parsePassword } from './auth.validation';

// Reserved internal subject: registration generates random UUIDs and cannot claim this role.
export const ENV_ADMIN_SUBJECT = 'lovebind:env-admin:v1';

function envAdminEmail(): string | null {
  if (!process.env.LOVEBIND_ADMIN_EMAIL || !process.env.LOVEBIND_ADMIN_PASSWORD) return null;
  return process.env.LOVEBIND_ADMIN_EMAIL.trim().toLowerCase();
}

/**
 * Runs before HTTP starts listening. A dedicated, pending, profile-less user
 * uses normal hashed credentials and normal revocable authentication sessions.
 * No environment password is written to logs, the browser, or the database.
 */
export async function bootstrapEnvAdmin(prisma: PrismaService): Promise<void> {
  const rawEmail = process.env.LOVEBIND_ADMIN_EMAIL;
  const password = process.env.LOVEBIND_ADMIN_PASSWORD;
  if (!rawEmail && !password) return;
  if (!rawEmail || !password) {
    throw new Error('Set both LOVEBIND_ADMIN_EMAIL and LOVEBIND_ADMIN_PASSWORD, or neither.');
  }
  let email: string;
  try {
    email = parseEmail(rawEmail);
    parsePassword(password);
  } catch {
    throw new Error('Configured admin email or password format is invalid.');
  }
  if (password.length < 16) {
    throw new Error('LOVEBIND_ADMIN_PASSWORD must contain at least 16 characters.');
  }

  const admin = await prisma.user.findUnique({
    where: { authSubject: ENV_ADMIN_SUBJECT }, include: { credential: true },
  });
  const collision = await prisma.emailCredential.findUnique({ where: { email } });
  if (collision && collision.userId !== admin?.id) {
    throw new Error('Admin email already belongs to a member. Use a separate admin email.');
  }
  if (!admin) {
    await prisma.user.create({
      data: {
        authSubject: ENV_ADMIN_SUBJECT,
        status: 'PENDING',
        credential: { create: { email, passwordHash: await hashPassword(password) } },
      },
    });
    return;
  }
  if (admin.status === 'DELETED' || admin.status === 'SUSPENDED' || !admin.credential) {
    throw new Error('Configured admin account is unavailable; resolve it manually.');
  }
  const passwordChanged = !(await verifyPassword(password, admin.credential.passwordHash));
  if (!passwordChanged && admin.credential.email === email) return;
  await prisma.$transaction(async tx => {
    await tx.emailCredential.update({
      where: { userId: admin.id },
      data: {
        email,
        ...(passwordChanged ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
    // Rotating credentials invalidates previously issued admin sessions.
    await tx.authSession.updateMany({
      where: { userId: admin.id, revokedAt: null }, data: { revokedAt: new Date() },
    });
  });
}

export async function canModerate(prisma: PrismaService, userId: string): Promise<boolean> {
  const explicitIds = (process.env.LOVEBIND_MODERATOR_IDS ?? '')
    .split(',').map(id => id.trim()).filter(Boolean);
  if (explicitIds.includes(userId)) return true;

  // Removing either env variable disables bootstrap-admin privileges.
  const email = envAdminEmail();
  if (!email) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { authSubject: true, credential: { select: { email: true } } },
  });
  return user?.authSubject === ENV_ADMIN_SUBJECT && user.credential?.email === email;
}
