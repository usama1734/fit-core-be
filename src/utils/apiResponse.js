export function successResponse(data, message = null, meta) {
  const body = {
    success: true,
    data,
    ...(message && { message }),
  };
  if (meta != null) {
    body.meta = meta;
  }
  return body;
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
