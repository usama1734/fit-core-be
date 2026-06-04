import { prisma } from '#config/prisma.js';
import { AppError } from '#utils/AppError.js';
import { paginatedFindMany } from '#utils/pagination.js';
import { memberInclude } from '#utils/userSelect.js';
import { assertValidVenueToken } from './gymCheckIn.service.js';

const attendanceInclude = {
  member: { include: memberInclude },
};

async function resolveCheckInMemberId(dto, actor) {
  if (actor.role !== 'MEMBER') {
    throw new AppError('Only members can check in by scanning the gym QR', 403, 'FORBIDDEN');
  }
  if (!dto.venueToken?.trim()) {
    throw new AppError('venueToken is required', 400, 'VALIDATION_ERROR');
  }
  await assertValidVenueToken(dto.venueToken);
  return actor.memberId;
}

async function assertMemberAccess(memberId, actor) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');

  if (actor.role === 'MEMBER' && actor.memberId !== memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (actor.role === 'TRAINER' && member.trainerId !== actor.trainerId) {
    throw new AppError('Member not assigned to you', 403, 'FORBIDDEN');
  }

  return member;
}

function isMembershipActive(member) {
  if (!member.membershipEnd) return true;
  return new Date(member.membershipEnd) >= new Date();
}

export async function checkIn(dto, actor) {
  const memberId = await resolveCheckInMemberId(dto, actor);
  const member = await assertMemberAccess(memberId, actor);

  if (member.paymentStatus !== 'PAID') {
    throw new AppError('Membership payment required before check-in', 403, 'PAYMENT_REQUIRED');
  }

  if (!isMembershipActive(member)) {
    throw new AppError('Membership expired', 403, 'MEMBERSHIP_EXPIRED');
  }

  const open = await prisma.attendance.findFirst({
    where: { memberId, checkOutAt: null },
  });
  if (open) {
    throw new AppError('Member already checked in', 409, 'ALREADY_CHECKED_IN');
  }

  return prisma.attendance.create({
    data: {
      memberId,
      method: 'QR',
      notes: dto.notes,
    },
    include: attendanceInclude,
  });
}

export async function checkOut(attendanceId, dto, actor) {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { member: true },
  });
  if (!attendance) throw new AppError('Attendance not found', 404, 'NOT_FOUND');
  if (attendance.checkOutAt) {
    throw new AppError('Already checked out', 409, 'ALREADY_CHECKED_OUT');
  }

  await assertMemberAccess(attendance.memberId, actor);

  if (actor.role === 'MEMBER' && actor.memberId !== attendance.memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      checkOutAt: new Date(),
      notes: dto.notes ?? attendance.notes,
    },
    include: attendanceInclude,
  });
}

export async function listAttendance(actor, query = {}) {
  const where = {};
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;

  if (from || to) {
    where.checkInAt = {};
    if (from) where.checkInAt.gte = from;
    if (to) where.checkInAt.lte = to;
  }

  if (actor.role === 'MEMBER') {
    where.memberId = actor.memberId;
  } else if (actor.role === 'TRAINER') {
    where.member = { trainerId: actor.trainerId };
  }

  return paginatedFindMany(
    (args) =>
      prisma.attendance.findMany({
        ...args,
        include: attendanceInclude,
        orderBy: { checkInAt: 'desc' },
      }),
    (args) => prisma.attendance.count(args),
    { where },
    query,
  );
}

export async function getAttendanceById(id, actor) {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: attendanceInclude,
  });
  if (!attendance) throw new AppError('Attendance not found', 404, 'NOT_FOUND');

  if (actor.role === 'MEMBER' && attendance.memberId !== actor.memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (actor.role === 'TRAINER' && attendance.member.trainerId !== actor.trainerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return attendance;
}

export async function updateAttendance(id, dto) {
  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance) throw new AppError('Attendance not found', 404, 'NOT_FOUND');

  return prisma.attendance.update({
    where: { id },
    data: {
      checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : undefined,
      checkOutAt:
        dto.checkOutAt !== undefined
          ? dto.checkOutAt
            ? new Date(dto.checkOutAt)
            : null
          : undefined,
      method: dto.method,
      notes: dto.notes,
    },
    include: attendanceInclude,
  });
}

export async function deleteAttendance(id) {
  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance) throw new AppError('Attendance not found', 404, 'NOT_FOUND');
  await prisma.attendance.delete({ where: { id } });
  return { id, deleted: true };
}
