export function successResponse(data, message = null, meta = {}) {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(Object.keys(meta).length > 0 && { meta }),
  };
}

export function errorResponse(code, message, details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 && { details }),
    },
  };
}
