import Stripe from 'stripe';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { memberInclude } from '../utils/userSelect.js';

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

const paymentInclude = {
  member: { include: memberInclude },
  membershipPlan: true,
};

function getStripe() {
  if (!stripe) {
    throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
  }
  return stripe;
}

function isValidHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Stripe requires absolute success/cancel URLs; {CHECKOUT_SESSION_ID} is appended if missing. */
function resolveCheckoutUrls() {
  const cancelUrl = env.STRIPE_CANCEL_URL.trim();
  let successUrl = env.STRIPE_SUCCESS_URL.trim();

  if (!successUrl.includes('{CHECKOUT_SESSION_ID}')) {
    successUrl += successUrl.includes('?')
      ? '&session_id={CHECKOUT_SESSION_ID}'
      : '?session_id={CHECKOUT_SESSION_ID}';
  }

  if (!isValidHttpUrl(cancelUrl) || !isValidHttpUrl(successUrl.replace('{CHECKOUT_SESSION_ID}', 'test'))) {
    throw new AppError(
      'Stripe redirect URLs are invalid. Set FRONTEND_URL or STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL in backend .env (e.g. http://localhost:5173/payment/success).',
      503,
      'STRIPE_CONFIG',
    );
  }

  return { successUrl, cancelUrl };
}

function wrapStripeError(err) {
  if (err?.type?.startsWith('Stripe')) {
    const message =
      err.param === 'success_url' || err.param === 'cancel_url'
        ? 'Stripe redirect URL is invalid. Check STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL in backend .env, then restart the API server.'
        : err.message;
    throw new AppError(message, 400, 'STRIPE_ERROR', {
      code: err.code,
      param: err.param,
    });
  }
  throw err;
}

export async function listPayments(actor) {
  const where = {};
  if (actor.role === 'MEMBER') {
    where.memberId = actor.memberId;
  } else if (actor.role === 'TRAINER') {
    where.member = { trainerId: actor.trainerId };
  }

  return prisma.payment.findMany({
    where,
    include: paymentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPaymentById(id, actor) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
  if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');

  if (actor.role === 'MEMBER' && payment.memberId !== actor.memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (actor.role === 'TRAINER' && payment.member.trainerId !== actor.trainerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return payment;
}

export async function createCheckoutSession(dto, actor) {
  const memberId =
    actor.role === 'ADMIN' && dto.memberId ? dto.memberId : actor.memberId;

  if (!memberId) {
    throw new AppError('Member profile required', 400, 'VALIDATION_ERROR');
  }

  const [member, plan] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId }, include: { user: true } }),
    prisma.membershipPlan.findUnique({ where: { id: dto.planId } }),
  ]);

  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');
  if (!plan || !plan.isActive) throw new AppError('Plan not found', 404, 'NOT_FOUND');

  if (actor.role === 'MEMBER' && actor.memberId !== memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const amount = Number(plan.price);

  const payment = await prisma.payment.create({
    data: {
      memberId,
      planId: plan.id,
      amount,
      status: 'PENDING',
    },
  });

  const stripeClient = getStripe();
  const lineItems = plan.stripePriceId
    ? [{ price: plan.stripePriceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `FitCore — ${plan.name}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ];

  const { successUrl, cancelUrl } = resolveCheckoutUrls();

  let session;
  try {
    session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: member.user.email,
      metadata: {
        paymentId: payment.id,
        memberId,
        planId: plan.id,
      },
    });
  } catch (err) {
    wrapStripeError(err);
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  return { sessionId: session.id, url: session.url, paymentId: payment.id };
}

export async function handleStripeWebhook(rawBody, signature) {
  const stripeClient = getStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError('Webhook secret not configured', 503, 'STRIPE_UNAVAILABLE');
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment && payment.status === 'PENDING') {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: paymentId },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent ?? null,
            },
          });

          if (payment.planId) {
            const plan = await tx.membershipPlan.findUnique({
              where: { id: payment.planId },
            });
            if (plan) {
              const start = new Date();
              const end = new Date(start);
              end.setDate(end.getDate() + plan.durationDays);
              await tx.member.update({
                where: { id: payment.memberId },
                data: {
                  membershipPlanId: plan.id,
                  membershipStart: start,
                  membershipEnd: end,
                },
              });
            }
          }
        });
      }
    }
  }

  return { received: true, type: event.type };
}

export async function createManualPayment(dto) {
  const member = await prisma.member.findUnique({ where: { id: dto.memberId } });
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');

  let planId = dto.planId;
  if (planId) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }

  return prisma.payment.create({
    data: {
      memberId: dto.memberId,
      planId,
      amount: dto.amount,
      currency: dto.currency ?? 'usd',
      status: dto.status,
      paidAt: dto.status === 'COMPLETED' ? new Date() : null,
    },
    include: paymentInclude,
  });
}

export async function updatePayment(id, dto) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');

  return prisma.payment.update({
    where: { id },
    data: {
      status: dto.status,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : dto.status === 'COMPLETED' ? new Date() : undefined,
    },
    include: paymentInclude,
  });
}

export async function deletePayment(id) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
  await prisma.payment.delete({ where: { id } });
  return { id, deleted: true };
}
