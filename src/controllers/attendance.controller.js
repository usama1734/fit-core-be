import * as attendanceService from '#services/attendance.service.js';
import * as gymCheckInService from '#services/gymCheckIn.service.js';
import { AppError } from '#utils/AppError.js';
import { successResponse } from '#utils/apiResponse.js';
import { auditLog } from '#middleware/auditLogger.middleware.js';

const CHECKIN_FAILURE_CODES = new Set([
  'INVALID_VENUE_QR',
  'PAYMENT_REQUIRED',
  'MEMBERSHIP_EXPIRED',
  'ALREADY_CHECKED_IN',
]);

export async function checkIn(req, res, next) {
  try {
    const attendance = await attendanceService.checkIn(req.body, req.user);
    auditLog({
      action: 'ATTENDANCE_CHECKIN',
      actorId: req.user.id,
      resource: `attendance:${attendance.id}`,
      meta: { method: attendance.method, venue: Boolean(req.body.venueToken) },
    });
    res.status(201).json(successResponse(attendance, 'Checked in'));
  } catch (err) {
    if (err instanceof AppError && CHECKIN_FAILURE_CODES.has(err.code)) {
      auditLog({
        action: 'ATTENDANCE_CHECKIN_FAILED',
        actorId: req.user?.id ?? null,
        resource: req.user?.memberId ? `member:${req.user.memberId}` : null,
        meta: { code: err.code, venue: Boolean(req.body?.venueToken) },
      });
    }
    next(err);
  }
}

export async function getGymQr(req, res) {
  const payload = await gymCheckInService.getGymQrPayload();
  res.json(successResponse(payload));
}

export async function regenerateGymQr(req, res) {
  const payload = await gymCheckInService.regenerateGymToken();
  res.json(successResponse(payload, 'Gym check-in QR regenerated'));
}

export async function checkOut(req, res) {
  const attendance = await attendanceService.checkOut(req.params.id, req.body, req.user);
  res.json(successResponse(attendance, 'Checked out'));
}

export async function list(req, res) {
  const { items, meta } = await attendanceService.listAttendance(req.user, req.query);
  res.json(successResponse(items, null, meta));
}

export async function getById(req, res) {
  const record = await attendanceService.getAttendanceById(req.params.id, req.user);
  res.json(successResponse(record));
}

export async function update(req, res) {
  const record = await attendanceService.updateAttendance(req.params.id, req.body);
  res.json(successResponse(record, 'Attendance updated'));
}

export async function remove(req, res) {
  const result = await attendanceService.deleteAttendance(req.params.id);
  res.json(successResponse(result, 'Attendance deleted'));
}
