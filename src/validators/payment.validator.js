import { z } from 'zod';

export const createCheckoutSchema = z.object({
  planId: z.string().min(1),
});

export const confirmCheckoutSchema = z.object({
  sessionId: z.string().min(1),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  paidAt: z.string().datetime().optional(),
});

export const createManualPaymentSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().default('usd'),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('COMPLETED'),
});
