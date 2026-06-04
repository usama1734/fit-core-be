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

async function syncPendingPaymentWithStripe(payment) {
  if (!payment.stripeSessionId || payment.status !== 'PENDING') {
    return payment;
  }

  const stripeClient = getStripe();
  let session;
  try {
    session = await stripeClient.checkout.sessions.retrieve(payment.stripeSessionId);
  } catch {
    return payment;
  }

  if (session.payment_status === 'paid') {
    const { payment: fulfilled } = await fulfillPaymentRecord(payment.id, {
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      planIdOverride: session.metadata?.planId || undefined,
    });
    return fulfilled;
  }

  if (session.status === 'expired') {
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
      include: paymentInclude,
    });
  }

  const ageMs = Date.now() - new Date(payment.createdAt).getTime();
  const isStaleOpen =
    session.status === 'open' &&
    session.payment_status !== 'paid' &&
    ageMs > 60 * 60 * 1000;

  if (isStaleOpen) {
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
      include: paymentInclude,
    });
  }

  return payment;
}

export async function syncMemberPendingPayments(memberId) {
  const pending = await prisma.payment.findMany({
    where: { memberId, status: 'PENDING', stripeSessionId: { not: null } },
    orderBy: { createdAt: 'desc' },
  });

  for (const payment of pending) {
    await syncPendingPaymentWithStripe(payment);
  }
}

export async function listPayments(actor) {
  const where = {};
  if (actor.role === 'MEMBER') {
    where.memberId = actor.memberId;
    await syncMemberPendingPayments(actor.memberId);
  } else if (actor.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
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
  if (actor.role !== 'MEMBER' || !actor.memberId) {
    throw new AppError('Only members can purchase membership plans', 403, 'FORBIDDEN');
  }

  const memberId = actor.memberId;

  const [member, plan] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId }, include: { user: true } }),
    prisma.membershipPlan.findUnique({ where: { id: dto.planId } }),
  ]);

  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');
  if (!plan || !plan.isActive) throw new AppError('Plan not found', 404, 'NOT_FOUND');

  const amount = Number(plan.price);
  const stripeClient = getStripe();

  const recentPending = await prisma.payment.findFirst({
    where: {
      memberId,
      planId: plan.id,
      status: 'PENDING',
      stripeSessionId: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentPending?.stripeSessionId) {
    try {
      const existingSession = await stripeClient.checkout.sessions.retrieve(
        recentPending.stripeSessionId,
      );
      if (existingSession.payment_status === 'paid') {
        await fulfillPaymentRecord(recentPending.id, {
          planIdOverride: plan.id,
        });
        throw new AppError(
          'This plan is already paid. Refresh your profile to see the update.',
          409,
          'ALREADY_PAID',
        );
      }
      if (existingSession.status === 'open' && existingSession.url) {
        return {
          sessionId: existingSession.id,
          url: existingSession.url,
          paymentId: recentPending.id,
          reused: true,
        };
      }
      await prisma.payment.update({
        where: { id: recentPending.id },
        data: { status: 'FAILED' },
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
  }

  const payment = await prisma.payment.create({
    data: {
      memberId,
      planId: plan.id,
      amount,
      status: 'PENDING',
    },
  });

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

async function applyPlanToMember(tx, memberId, planId, { isRenewal = false } = {}) {
  const [existing, plan] = await Promise.all([
    tx.member.findUnique({ where: { id: memberId } }),
    tx.membershipPlan.findUnique({ where: { id: planId } }),
  ]);
  if (!plan) return null;

  const now = new Date();
  const samePlan = existing?.membershipPlanId === plan.id;
  const start =
    isRenewal && !samePlan
      ? now
      : existing?.membershipEnd && new Date(existing.membershipEnd) > now
        ? new Date(existing.membershipEnd)
        : now;
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);

  return tx.member.update({
    where: { id: memberId },
    data: {
      membershipPlanId: plan.id,
      membershipStart: start,
      membershipEnd: end,
      paymentStatus: 'PAID',
    },
    include: memberInclude,
  });
}

async function fulfillPaymentRecord(
  paymentId,
  { stripePaymentIntentId = null, planIdOverride = null } = {},
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  const targetPlanId = planIdOverride ?? payment.planId;

  if (payment.status === 'COMPLETED') {
    const completedPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });
    let member = await prisma.member.findUnique({
      where: { id: payment.memberId },
      include: memberInclude,
    });
    if (targetPlanId && member?.membershipPlanId !== targetPlanId) {
      member = await prisma.$transaction((tx) =>
        applyPlanToMember(tx, payment.memberId, targetPlanId, { isRenewal: true }),
      );
    }
    return { payment: completedPayment, member, alreadyCompleted: true };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        stripePaymentIntentId,
        ...(targetPlanId && targetPlanId !== payment.planId && { planId: targetPlanId }),
      },
      include: paymentInclude,
    });

    let updatedMember = null;
    if (targetPlanId) {
      const existing = await tx.member.findUnique({ where: { id: payment.memberId } });
      const isRenewal = Boolean(
        existing?.membershipPlanId && existing.membershipPlanId !== targetPlanId,
      );
      updatedMember = await applyPlanToMember(tx, payment.memberId, targetPlanId, {
        isRenewal,
      });
    }

    return { payment: updatedPayment, member: updatedMember };
  });

  return { ...result, alreadyCompleted: false };
}

export async function confirmCheckoutSession(sessionId, actor) {
  if (!sessionId?.trim()) {
    throw new AppError('session_id is required', 400, 'VALIDATION_ERROR');
  }

  const stripeClient = getStripe();
  let session;
  try {
    session = await stripeClient.checkout.sessions.retrieve(sessionId.trim());
  } catch (err) {
    wrapStripeError(err);
  }

  if (session.payment_status !== 'paid') {
    throw new AppError('Payment has not been completed yet', 400, 'PAYMENT_INCOMPLETE');
  }

  const paymentId = session.metadata?.paymentId;
  const metadataPlanId = session.metadata?.planId;
  if (!paymentId) {
    throw new AppError('Checkout session is missing payment metadata', 400, 'INVALID_SESSION');
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (actor.role !== 'MEMBER' || payment.memberId !== actor.memberId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (payment.stripeSessionId && payment.stripeSessionId !== session.id) {
    throw new AppError('Session does not match this payment', 400, 'INVALID_SESSION');
  }

  if (!payment.stripeSessionId) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { stripeSessionId: session.id },
    });
  }

  return fulfillPaymentRecord(paymentId, {
    stripePaymentIntentId:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    planIdOverride: metadataPlanId || undefined,
  });
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
      await fulfillPaymentRecord(paymentId, {
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
      });
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

  const payment = await prisma.payment.create({
    data: {
      memberId: dto.memberId,
      planId,
      amount: dto.amount,
      currency: dto.currency ?? 'usd',
      status: dto.status === 'COMPLETED' ? 'PENDING' : dto.status,
      paidAt: null,
    },
  });

  if (dto.status === 'COMPLETED') {
    const { payment: fulfilled } = await fulfillPaymentRecord(payment.id);
    return fulfilled;
  }

  return prisma.payment.findUnique({
    where: { id: payment.id },
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
