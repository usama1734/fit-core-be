import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const CONFIG_ID = 'default';

function generateGymToken() {
  return `FC-GYM-${randomUUID()}`;
}

export function buildCheckInUrl(token) {
  const url = new URL('/check-in', env.FRONTEND_URL);
  url.searchParams.set('k', token);
  return url.toString();
}

async function ensureConfig() {
  let config = await prisma.gymCheckInConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config) {
    config = await prisma.gymCheckInConfig.create({
      data: { id: CONFIG_ID, token: generateGymToken() },
    });
  }
  return config;
}

export async function getConfig() {
  return ensureConfig();
}

export async function getGymQrPayload() {
  const config = await ensureConfig();
  const url = buildCheckInUrl(config.token);
  const qrCodeDataUrl = await QRCode.toDataURL(config.token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  return { url, token: config.token, qrCodeDataUrl };
}

export async function regenerateGymToken() {
  const token = generateGymToken();
  await prisma.gymCheckInConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, token },
    update: { token },
  });
  const url = buildCheckInUrl(token);
  const qrCodeDataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  return { url, token, qrCodeDataUrl };
}

export async function assertValidVenueToken(token) {
  if (!token?.trim()) {
    throw new AppError('Invalid gym check-in QR', 400, 'INVALID_VENUE_QR');
  }
  const config = await ensureConfig();
  if (config.token !== token.trim()) {
    throw new AppError('Invalid gym check-in QR', 400, 'INVALID_VENUE_QR');
  }
}
