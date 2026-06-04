import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  durationDays: z.coerce.number().int().positive(),
  features: z.array(z.string()).optional(),
  stripePriceId: z.string().optional(),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});
