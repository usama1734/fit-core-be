import { AppError } from './AppError.js';

/**
 * Normalize a scanned QR payload to a member desk token (Member.qrToken).
 */
export function normalizeMemberQrScan(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const t = url.searchParams.get('t') ?? url.searchParams.get('token');
      if (t?.trim()) return t.trim();

      const k = url.searchParams.get('k');
      if (k?.trim()) {
        if (k.trim().startsWith('FC-GYM-')) {
          throw new AppError(
            'This is the gym entrance QR. Ask the member to scan it with their phone, or use their desk QR from Profile.',
            400,
            'INVALID_QR',
          );
        }
        return k.trim();
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
  }

  if (trimmed.startsWith('FC-GYM-')) {
    throw new AppError(
      'This is the gym entrance QR. Ask the member to scan it with their phone, or use their desk QR from Profile.',
      400,
      'INVALID_QR',
    );
  }

  return trimmed;
}
