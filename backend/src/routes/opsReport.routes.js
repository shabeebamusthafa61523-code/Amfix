import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getOpsStaffList,
  getSubmittedDates,
  getLeadStats,
  getClientLeadStats
} from '../controllers/opsReport.controller.js';

const router = Router();

// Apply global authentication check on all Operations report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/ops-staff', getOpsStaffList);
router.get('/submitted-dates', getSubmittedDates);
router.get('/lead-stats', getLeadStats);
router.get('/client-lead-stats', getClientLeadStats);

export default router;
