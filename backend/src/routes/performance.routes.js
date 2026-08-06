import { Router } from 'express';
import protectRoute, { requireRole } from '../middleware/auth.middleware.js';
import {
  getEmployeePerformance,
  saveHRRemark,
  saveTeamLeadRemark,
  triggerAIReport,
  getPerformanceAnalytics,
  getPerformanceReports,
  updatePerformanceRecord
} from '../controllers/performance.controller.js';

const router = Router();

// Protect all routes with JWT middleware
router.use(protectRoute);

// Employee Performance Details & Overview
router.get('/employee/:employeeId', getEmployeePerformance);

// HR Remark (HR Manager & Admin only)
router.post('/employee/:employeeId/hr-remark', requireRole(['hr', 'admin']), saveHRRemark);

// Team Lead Remark (Assigned Team Lead, Manager, HR, Admin)
router.post('/employee/:employeeId/tl-remark', requireRole(['manager', 'hr', 'admin', 'employee']), saveTeamLeadRemark);

// AI Report Generation
router.post('/employee/:employeeId/ai-report', requireRole(['hr', 'manager', 'admin']), triggerAIReport);

// Performance & KPI Analytics Dashboard Data
router.get('/analytics', getPerformanceAnalytics);

// Performance Reports
router.get('/reports', getPerformanceReports);

// Unified Record Update (HR Remarks, Admin Remarks, Status, Remarks)
router.post('/update-record', updatePerformanceRecord);

export default router;
