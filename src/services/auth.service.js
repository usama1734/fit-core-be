import { prisma } from '#config/prisma.js';
import { AppError } from '#utils/AppError.js';
import { comparePassword } from '#utils/password.js';
import { signToken } from '#utils/jwt.js';
import { publicUserSelect } from '#utils/userSelect.js';

async function buildAuthPayload(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trainer: true, member: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    trainerId: user.trainer?.id ?? null,
    memberId: user.member?.id ?? null,
  };
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { trainer: true, member: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const tokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    trainerId: user.trainer?.id ?? null,
    memberId: user.member?.id ?? null,
  };

  const token = signToken(tokenPayload);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      trainerId: user.trainer?.id ?? null,
      memberId: user.member?.id ?? null,
    },
  };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      trainer: { select: { id: true, phone: true, specialty: true, bio: true } },
      member: {
        include: {
          trainer: {
            include: { user: { select: publicUserSelect } },
          },
          membershipPlan: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return user;
}

export { buildAuthPayload };
