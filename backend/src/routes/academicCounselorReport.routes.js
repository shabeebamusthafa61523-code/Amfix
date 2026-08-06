import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getCounselorsList,
  getSubmittedDates,
  getReportsByRange
} from '../controllers/academicCounselorReport.controller.js';

const router = Router();

// Apply global authentication check on all academic counselor report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.get('/range', getReportsByRange);
router.post('/', saveReport);
router.get('/counselors', getCounselorsList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
