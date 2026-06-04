export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
};

export const memberInclude = {
  user: { select: publicUserSelect },
  trainer: {
    include: {
      user: { select: publicUserSelect },
    },
  },
  membershipPlan: true,
};

export const trainerInclude = {
  user: { select: publicUserSelect },
  _count: { select: { members: true } },
};
