import { prisma } from '#config/prisma.js';
import { AppError } from '#utils/AppError.js';
import { paginatedFindMany } from '#utils/pagination.js';

export async function createPlan(dto) {
  return prisma.membershipPlan.create({
    data: {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      durationDays: dto.durationDays,
      features: dto.features ?? [],
      stripePriceId: dto.stripePriceId,
    },
  });
}

export async function listPlans(includeInactive = false, query = {}) {
  const where = includeInactive ? {} : { isActive: true };
  return paginatedFindMany(
    (args) => prisma.membershipPlan.findMany({ ...args, orderBy: { price: 'asc' } }),
    (args) => prisma.membershipPlan.count(args),
    { where },
    query,
  );
}

export async function getPlanById(id) {
  const plan = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  return plan;
}

export async function updatePlan(id, dto) {
  await getPlanById(id);
  return prisma.membershipPlan.update({
    where: { id },
    data: dto,
  });
}

export async function deletePlan(id) {
  await getPlanById(id);
  return prisma.membershipPlan.update({
    where: { id },
    data: { isActive: false },
  });
}
