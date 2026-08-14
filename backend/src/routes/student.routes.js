import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  markAttendance,
  getAttendanceByDate,
  getStudentProfile
} from '../controllers/student.controller.js';

const router = express.Router();

// Apply authentication middleware to all student/attendance routes
router.use(protectRoute);

router.post('/attendance/mark', markAttendance);
router.get('/attendance/student/:date', getAttendanceByDate);
router.get('/student/profile/:id', getStudentProfile);
router.get('/students/:id/profile', getStudentProfile);

export default router;