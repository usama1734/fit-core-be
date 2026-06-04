import * as memberService from '#services/member.service.js';
import { successResponse } from '#utils/apiResponse.js';
import { auditLog } from '#middleware/auditLogger.middleware.js';

export async function create(req, res) {
  const member = await memberService.createMember(req.body, req.user);
  auditLog({ action: 'MEMBER_CREATED', actorId: req.user.id, resource: `member:${member.id}` });
  res.status(201).json(successResponse(member, 'Member created'));
}

export async function list(req, res) {
  const { items, meta } = await memberService.listMembers(req.user, req.query);
  res.json(successResponse(items, null, meta));
}

export async function getById(req, res) {
  const member = await memberService.getMemberById(req.params.id, req.user);
  res.json(successResponse(member));
}

export async function getMe(req, res) {
  const member = await memberService.getOwnProfile(req.user);
  res.json(successResponse(member));
}

export async function updateMe(req, res) {
  const member = await memberService.updateOwnProfile(req.user, req.body);
  res.json(successResponse(member, 'Profile updated'));
}

export async function update(req, res) {
  const member = await memberService.updateMember(req.params.id, req.body, req.user);
  auditLog({ action: 'MEMBER_UPDATED', actorId: req.user.id, resource: `member:${member.id}` });
  res.json(successResponse(member, 'Member updated'));
}

export async function assignTrainer(req, res) {
  const member = await memberService.assignTrainer(req.params.id, req.body.trainerId);
  res.json(successResponse(member, 'Trainer assigned'));
}

export async function assignPlan(req, res) {
  const member = await memberService.assignPlan(
    req.params.id,
    req.body.membershipPlanId,
    req.body.membershipStart,
  );
  res.json(successResponse(member, 'Plan assigned'));
}

export async function remove(req, res) {
  const result = await memberService.deleteMember(req.params.id);
  res.json(successResponse(result, 'Member deactivated'));
}
