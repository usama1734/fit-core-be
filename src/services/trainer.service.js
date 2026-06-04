import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword } from '../utils/password.js';
import { trainerInclude, publicUserSelect, memberInclude } from '../utils/userSelect.js';

export async function createTrainer(dto) {
  const existing = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase() },
  });
  if (existing) {
    throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
  }

  const passwordHash = await hashPassword(dto.password);

  const trainer = await prisma.trainer.create({
    data: {
      phone: dto.phone,
      specialty: dto.specialty,
      bio: dto.bio,
      user: {
        create: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'TRAINER',
        },
      },
    },
    include: trainerInclude,
  });

  return trainer;
}

export async function listTrainers() {
  return prisma.trainer.findMany({
    include: trainerInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrainerById(id, actor = null) {
  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: trainerInclude,
  });
  if (!trainer) {
    throw new AppError('Trainer not found', 404, 'NOT_FOUND');
  }
  if (actor?.role === 'TRAINER' && actor.trainerId !== id) {
    throw new AppError('Cannot view other trainers', 403, 'FORBIDDEN');
  }
  return trainer;
}

export async function updateTrainer(id, dto) {
  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) {
    throw new AppError('Trainer not found', 404, 'NOT_FOUND');
  }

  const userData = {};
  if (dto.firstName) userData.firstName = dto.firstName;
  if (dto.lastName) userData.lastName = dto.lastName;
  if (dto.isActive !== undefined) userData.isActive = dto.isActive;

  return prisma.trainer.update({
    where: { id },
    data: {
      phone: dto.phone,
      specialty: dto.specialty,
      bio: dto.bio,
      ...(Object.keys(userData).length && { user: { update: userData } }),
    },
    include: trainerInclude,
  });
}

export async function getAssignedMembers(trainerId, actor) {
  if (actor.role === 'TRAINER' && actor.trainerId !== trainerId) {
    throw new AppError('Cannot view other trainers\' members', 403, 'FORBIDDEN');
  }

  return prisma.member.findMany({
    where: { trainerId },
    include: memberInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteTrainer(id) {
  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) {
    throw new AppError('Trainer not found', 404, 'NOT_FOUND');
  }

  await prisma.user.update({
    where: { id: trainer.userId },
    data: { isActive: false },
  });

  return { id, deactivated: true };
}
