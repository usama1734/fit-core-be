import * as trainerService from '#services/trainer.service.js';
import { successResponse } from '#utils/apiResponse.js';
import { auditLog } from '#middleware/auditLogger.middleware.js';

export async function create(req, res) {
  const trainer = await trainerService.createTrainer(req.body);
  auditLog({ action: 'TRAINER_CREATED', actorId: req.user.id, resource: `trainer:${trainer.id}` });
  res.status(201).json(successResponse(trainer, 'Trainer created'));
}

export async function list(req, res) {
  const { items, meta } = await trainerService.listTrainers(req.query);
  res.json(successResponse(items, null, meta));
}

export async function getById(req, res) {
  const trainer = await trainerService.getTrainerById(req.params.id, req.user);
  res.json(successResponse(trainer));
}

export async function update(req, res) {
  const trainer = await trainerService.updateTrainer(req.params.id, req.body);
  res.json(successResponse(trainer, 'Trainer updated'));
}

export async function remove(req, res) {
  const result = await trainerService.deleteTrainer(req.params.id);
  res.json(successResponse(result, 'Trainer deactivated'));
}

export async function assignedMembers(req, res) {
  const { items, meta } = await trainerService.getAssignedMembers(
    req.params.id,
    req.user,
    req.query,
  );
  res.json(successResponse(items, null, meta));
}

export async function myMembers(req, res) {
  const { items, meta } = await trainerService.getAssignedMembers(
    req.user.trainerId,
    req.user,
    req.query,
  );
  res.json(successResponse(items, null, meta));
}
