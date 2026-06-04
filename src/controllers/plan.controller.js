import * as planService from '#services/plan.service.js';
import { successResponse } from '#utils/apiResponse.js';

export async function create(req, res) {
  const plan = await planService.createPlan(req.body);
  res.status(201).json(successResponse(plan, 'Plan created'));
}

export async function list(req, res) {
  const includeInactive = req.user?.role === 'ADMIN';
  const { items, meta } = await planService.listPlans(includeInactive, req.query);
  res.json(successResponse(items, null, meta));
}

export async function getById(req, res) {
  const plan = await planService.getPlanById(req.params.id);
  res.json(successResponse(plan));
}

export async function update(req, res) {
  const plan = await planService.updatePlan(req.params.id, req.body);
  res.json(successResponse(plan, 'Plan updated'));
}

export async function remove(req, res) {
  const plan = await planService.deletePlan(req.params.id);
  res.json(successResponse(plan, 'Plan deactivated'));
}
