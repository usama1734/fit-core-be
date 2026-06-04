/**
 * Mirrors .cursor/hooks/auditLogger.js — keep in sync when changing audit actions.
 */
const AUDIT_ACTIONS = new Set([
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_FAILED',
  'RBAC_DENIED',
  'PAYMENT_CHECKOUT',
  'PAYMENT_WEBHOOK',
  'MEMBER_CREATED',
  'MEMBER_UPDATED',
  'TRAINER_CREATED',
  'ATTENDANCE_CHECKIN',
  'ATTENDANCE_CHECKIN_FAILED',
  'ATTENDANCE_CHECKOUT',
]);

export function auditLog({ action, actorId = null, resource = null, meta = {} }) {
  if (!AUDIT_ACTIONS.has(action)) {
    console.warn(`[audit] Unknown action: ${action}`);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    action,
    actorId,
    resource,
    meta,
  };

  console.log('[audit]', JSON.stringify(entry));
}

export function auditLoggerMiddleware(req, res, next) {
  req.audit = (payload) =>
    auditLog({
      ...payload,
      actorId: payload.actorId ?? req.user?.id ?? null,
    });
  next();
}
