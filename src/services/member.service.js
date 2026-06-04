import { prisma } from '#config/prisma.js';
import { AppError } from '#utils/AppError.js';
import { hashPassword } from '#utils/password.js';
import { paginatedFindMany } from '#utils/pagination.js';
import { memberInclude } from '#utils/userSelect.js';

function applyMembershipDates(plan) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);
  return { membershipStart: start, membershipEnd: end };
}

export async function createMember(dto, actor = null) {
  const payload = { ...dto };

  if (actor?.role === 'TRAINER') {
    if (!actor.trainerId) {
      throw new AppError('Trainer profile not found', 403, 'FORBIDDEN');
    }
    payload.trainerId = actor.trainerId;
  }

  if (!payload.trainerId) delete payload.trainerId;
  if (!payload.membershipPlanId) delete payload.membershipPlanId;

  const existing = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });
  if (existing) {
    throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
  }

  if (payload.trainerId) {
    const trainer = await prisma.trainer.findUnique({ where: { id: payload.trainerId } });
    if (!trainer) throw new AppError('Trainer not found', 404, 'NOT_FOUND');
  }

  let plan = null;
  let membershipDates = {};
  if (payload.membershipPlanId) {
    plan = await prisma.membershipPlan.findUnique({ where: { id: payload.membershipPlanId } });
    if (!plan) throw new AppError('Membership plan not found', 404, 'NOT_FOUND');
    membershipDates = applyMembershipDates(plan);
  }

  const passwordHash = await hashPassword(payload.password);

  return prisma.member.create({
    data: {
      phone: payload.phone,
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
      trainerId: payload.trainerId,
      membershipPlanId: payload.membershipPlanId,
      ...membershipDates,
      user: {
        create: {
          email: payload.email.toLowerCase(),
          passwordHash,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: 'MEMBER',
        },
      },
    },
    include: memberInclude,
  });
}

export async function listMembers(actor, query = {}) {
  const where = {};
  if (actor.role === 'TRAINER') {
    where.trainerId = actor.trainerId;
  }

  return paginatedFindMany(
    (args) =>
      prisma.member.findMany({ ...args, include: memberInclude, orderBy: { createdAt: 'desc' } }),
    (args) => prisma.member.count(args),
    { where },
    query,
  );
}

export async function getMemberById(id, actor) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: memberInclude,
  });
  if (!member) {
    throw new AppError('Member not found', 404, 'NOT_FOUND');
  }

  if (actor.role === 'MEMBER' && actor.memberId !== id) {
    throw new AppError('Cannot access this profile', 403, 'FORBIDDEN');
  }
  if (actor.role === 'TRAINER' && member.trainerId !== actor.trainerId) {
    throw new AppError('Cannot access this member', 403, 'FORBIDDEN');
  }

  return member;
}

export async function getOwnProfile(actor) {
  if (!actor.memberId) {
    throw new AppError('Member profile not found', 404, 'NOT_FOUND');
  }
  return getMemberById(actor.memberId, actor);
}

export async function updateOwnProfile(actor, dto) {
  if (!actor.memberId) {
    throw new AppError('Member profile not found', 404, 'NOT_FOUND');
  }
  const member = await prisma.member.findUnique({ where: { id: actor.memberId } });
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');

  const userData = {};
  if (dto.firstName) userData.firstName = dto.firstName;
  if (dto.lastName) userData.lastName = dto.lastName;

  return prisma.member.update({
    where: { id: actor.memberId },
    data: {
      phone: dto.phone !== undefined ? dto.phone : undefined,
      ...(Object.keys(userData).length && { user: { update: userData } }),
    },
    include: memberInclude,
  });
}

export async function updateMember(id, dto, actor) {
  if (actor.role !== 'ADMIN') {
    throw new AppError('Only admins can update members', 403, 'FORBIDDEN');
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');

  const userData = {};
  if (dto.firstName) userData.firstName = dto.firstName;
  if (dto.lastName) userData.lastName = dto.lastName;
  if (dto.isActive !== undefined) userData.isActive = dto.isActive;

  return prisma.member.update({
    where: { id },
    data: {
      phone: dto.phone,
      dateOfBirth:
        dto.dateOfBirth !== undefined
          ? dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : null
          : undefined,
      ...(Object.keys(userData).length && { user: { update: userData } }),
    },
    include: memberInclude,
  });
}

export async function assignTrainer(memberId, trainerId) {
  const [member, trainer] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    prisma.trainer.findUnique({ where: { id: trainerId } }),
  ]);
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');
  if (!trainer) throw new AppError('Trainer not found', 404, 'NOT_FOUND');

  return prisma.member.update({
    where: { id: memberId },
    data: { trainerId },
    include: memberInclude,
  });
}

export async function assignPlan(memberId, membershipPlanId, membershipStart) {
  const [member, plan] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    prisma.membershipPlan.findUnique({ where: { id: membershipPlanId } }),
  ]);
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');
  if (!plan) throw new AppError('Membership plan not found', 404, 'NOT_FOUND');

  const start = membershipStart ? new Date(membershipStart) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);

  return prisma.member.update({
    where: { id: memberId },
    data: {
      membershipPlanId,
      membershipStart: start,
      membershipEnd: end,
      paymentStatus: 'PAID',
    },
    include: memberInclude,
  });
}

export async function deleteMember(id) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');

  await prisma.user.update({
    where: { id: member.userId },
    data: { isActive: false },
  });

  return { id, deactivated: true };
}
