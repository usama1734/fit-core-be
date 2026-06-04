import 'dotenv/config';

/** Treat unset or blank env values as missing (empty string would bypass ??). */
function envString(value, fallback) {
  const trimmed = (value ?? '').trim();
  return trimmed || fallback;
}

const FRONTEND_URL = envString(process.env.FRONTEND_URL, 'http://localhost:5173');

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  STRIPE_SECRET_KEY: envString(process.env.STRIPE_SECRET_KEY, ''),
  STRIPE_WEBHOOK_SECRET: envString(process.env.STRIPE_WEBHOOK_SECRET, ''),
  FRONTEND_URL,
  STRIPE_SUCCESS_URL: envString(
    process.env.STRIPE_SUCCESS_URL,
    `${FRONTEND_URL}/payment/success`,
  ),
  STRIPE_CANCEL_URL: envString(
    process.env.STRIPE_CANCEL_URL,
    `${FRONTEND_URL}/payment/cancel`,
  ),
};
