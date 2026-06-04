import * as paymentService from '../services/payment.service.js';
import { successResponse } from '../utils/apiResponse.js';
import { auditLog } from '../middleware/auditLogger.middleware.js';

export async function list(req, res) {
  const payments = await paymentService.listPayments(req.user);
  res.json(successResponse(payments));
}

export async function getById(req, res) {
  const payment = await paymentService.getPaymentById(req.params.id, req.user);
  res.json(successResponse(payment));
}

export async function checkout(req, res) {
  const session = await paymentService.createCheckoutSession(req.body, req.user);
  auditLog({
    action: 'PAYMENT_CHECKOUT',
    actorId: req.user.id,
    resource: `payment:${session.paymentId}`,
  });
  res.status(201).json(successResponse(session, 'Checkout session created'));
}

export async function webhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const result = await paymentService.handleStripeWebhook(req.body, signature);
  auditLog({ action: 'PAYMENT_WEBHOOK', resource: 'stripe/webhook', meta: result });
  res.json(successResponse(result));
}

export async function createManual(req, res) {
  const payment = await paymentService.createManualPayment(req.body);
  res.status(201).json(successResponse(payment, 'Payment recorded'));
}

export async function update(req, res) {
  const payment = await paymentService.updatePayment(req.params.id, req.body);
  res.json(successResponse(payment, 'Payment updated'));
}

export async function remove(req, res) {
  const result = await paymentService.deletePayment(req.params.id);
  res.json(successResponse(result, 'Payment deleted'));
}
