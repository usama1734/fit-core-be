import * as attendanceService from '../services/attendance.service.js';
import { successResponse } from '../utils/apiResponse.js';
import { auditLog } from '../middleware/auditLogger.middleware.js';

export async function checkIn(req, res) {
  const attendance = await attendanceService.checkIn(req.body, req.user);
  auditLog({
    action: 'ATTENDANCE_CHECKIN',
    actorId: req.user.id,
    resource: `attendance:${attendance.id}`,
  });
  res.status(201).json(successResponse(attendance, 'Checked in'));
}

export async function checkOut(req, res) {
  const attendance = await attendanceService.checkOut(req.params.id, req.body, req.user);
  res.json(successResponse(attendance, 'Checked out'));
}

export async function list(req, res) {
  const records = await attendanceService.listAttendance(req.user, req.query);
  res.json(successResponse(records));
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
