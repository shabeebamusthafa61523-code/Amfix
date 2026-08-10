import express from 'express';
import {
  markAttendance,
  getAttendanceByDate,
  getStudentProfile
} from '../controllers/student.controller.js';

const router = express.Router();

router.post('/attendance/mark', markAttendance);
router.get('/attendance/student/:date', getAttendanceByDate);
router.get('/student/profile/:id', getStudentProfile);
router.get('/students/:id/profile', getStudentProfile);

export default router;