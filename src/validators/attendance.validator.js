import { z } from 'zod';

export const checkInSchema = z.object({
  venueToken: z.string().min(1),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().optional(),
});

export const updateAttendanceSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional().nullable(),
  method: z.enum(['MANUAL', 'QR']).optional(),
  notes: z.string().optional().nullable(),
});
