import { z } from 'zod';

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const createMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  dateOfBirth: z.string().datetime().optional(),
  trainerId: optionalId,
  membershipPlanId: optionalId,
});

export const updateMemberSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateOwnProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
});

export const assignTrainerSchema = z.object({
  trainerId: z.string().min(1),
});

export const assignPlanSchema = z.object({
  membershipPlanId: z.string().min(1),
  membershipStart: z.string().datetime().optional(),
});
