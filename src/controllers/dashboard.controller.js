import * as dashboardService from '../services/dashboard.service.js';
import { successResponse } from '../utils/apiResponse.js';

export async function admin(req, res) {
  const data = await dashboardService.getAdminDashboard(req.query);
  res.json(successResponse(data));
}

export async function trainer(req, res) {
  const data = await dashboardService.getTrainerDashboard(req.user, req.query);
  res.json(successResponse(data));
}
