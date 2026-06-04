import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

function parseRange(query) {
  const from = query.from ? new Date(query.from) : startOfDay(new Date());
  const to = query.to ? new Date(query.to) : endOfDay(new Date());
  return { from, to };
}

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

export async function getAdminDashboard(query = {}) {
  const { from, to } = parseRange(query);
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [
    activeMembers,
    activeTrainers,
    checkInsToday,
    revenueAgg,
    expiringMemberships,
    recentPayments,
    attendanceByDay,
  ] = await Promise.all([
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
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),
    prisma.member.count({
      where: {
        membershipEnd: { gte: now, lte: inSevenDays },
      },
    }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      take: 5,
      orderBy: { paidAt: 'desc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        membershipPlan: { select: { name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { checkInAt: { gte: from, lte: to } },
      select: { checkInAt: true },
    }),
  ]);

  const series = buildAttendanceSeries(from, to, attendanceByDay);

  return {
    kpis: {
      activeMembers,
      activeTrainers,
      checkInsToday,
      revenueInRange: Number(revenueAgg._sum.amount ?? 0),
      expiringMemberships,
    },
    recentPayments,
    series,
    meta: { from: from.toISOString(), to: to.toISOString() },
  };
}

function buildAttendanceSeries(from, to, rows) {
  const labels = [];
  const values = [];
  const map = new Map();

  for (const row of rows) {
    const day = new Date(row.checkInAt).toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }

  const cursor = new Date(from);
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10);
    labels.push(key);
    values.push(map.get(key) ?? 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { labels, values };
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
