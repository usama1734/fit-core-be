import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseRange(query = {}) {
  const days = Math.min(90, Math.max(7, Number.parseInt(query.days, 10) || 14));
  const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
  const from = query.from
    ? startOfDay(new Date(query.from))
    : startOfDay(new Date(to.getTime() - (days - 1) * 86400000));
  return { from, to, days };
}

export async function getAdminDashboard(query = {}) {
  const { from, to, days } = parseRange(query);
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [
    totalMembers,
    activeMembers,
    activeTrainers,
    checkInsToday,
    expiringMemberships,
    expiredMembers,
    unpaidMembers,
    revenueAgg,
    recentPayments,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({
      where: {
        user: { isActive: true },
        OR: [{ membershipEnd: null }, { membershipEnd: { gte: now } }],
      },
    }),
    prisma.trainer.count({ where: { user: { isActive: true } } }),
    prisma.attendance.count({
      where: { checkInAt: { gte: startOfDay(now), lte: endOfDay(now) } },
    }),
    prisma.member.count({
      where: { membershipEnd: { gte: now, lte: inSevenDays } },
    }),
    prisma.member.count({
      where: { membershipEnd: { lt: now } },
    }),
    prisma.member.count({ where: { paymentStatus: 'UNPAID' } }),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED', paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      take: 8,
      orderBy: { paidAt: 'desc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        membershipPlan: { select: { name: true } },
      },
    }),
  ]);

  return {
    kpis: {
      totalMembers,
      activeMembers,
      activeTrainers,
      checkInsToday,
      revenueInRange: Number(revenueAgg._sum.amount ?? 0),
      expiringMemberships,
      expiredMembers,
      unpaidMembers,
    },
    recentPayments,
    meta: { from: from.toISOString(), to: to.toISOString(), days },
  };
}

export async function getTrainerDashboard(actor, query = {}) {
  if (!actor.trainerId) {
    throw new AppError('Trainer profile not found', 404, 'NOT_FOUND');
  }

  const { from, to } = parseRange(query);
  const now = new Date();

  const [assignedMembers, checkInsInRange, openCheckIns] = await Promise.all([
    prisma.member.count({ where: { trainerId: actor.trainerId } }),
    prisma.attendance.count({
      where: {
        member: { trainerId: actor.trainerId },
        checkInAt: { gte: from, lte: to },
      },
    }),
    prisma.attendance.count({
      where: {
        member: { trainerId: actor.trainerId },
        checkOutAt: null,
      },
    }),
  ]);

  const members = await prisma.member.findMany({
    where: { trainerId: actor.trainerId },
    take: 10,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      membershipPlan: { select: { name: true } },
      attendances: {
        take: 1,
        orderBy: { checkInAt: 'desc' },
      },
    },
  });

  return {
    kpis: {
      assignedMembers,
      checkInsInRange,
      openCheckIns,
    },
    members,
    meta: { from: from.toISOString(), to: to.toISOString() },
  };
}
