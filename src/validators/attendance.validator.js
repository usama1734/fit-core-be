import { z } from 'zod';

export const checkInSchema = z.object({
  memberId: z.string().optional(),
  method: z.enum(['MANUAL', 'QR']).optional(),
  notes: z.string().optional(),
  qrToken: z.string().optional(),
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
