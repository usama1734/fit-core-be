import { z } from 'zod';

export const checkInSchema = z
  .object({
    memberId: z.string().optional(),
    method: z.enum(['MANUAL', 'QR']).optional(),
    notes: z.string().optional(),
    qrToken: z.string().optional(),
    venueToken: z.string().optional(),
  })
  .refine((data) => !data.venueToken || !data.qrToken, {
    message: 'Provide either venueToken or qrToken, not both',
    path: ['venueToken'],
  })
  .refine((data) => !data.venueToken || !data.memberId, {
    message: 'venueToken check-in does not use memberId',
    path: ['memberId'],
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
