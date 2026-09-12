// src/routes/attendance.routes.js
import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js'; 
import { checkIn, checkOut, getAttendanceByDate, getAllAttendanceByDate, getAttendanceLogs, updateAttendanceRecord, getWifiSettings, updateWifiSettings } from '../controllers/attendance.controller.js';

const router = Router();

// Secure all endpoints below this line
router.use(protectRoute);

// Place explicit paths BEFORE dynamic parameters (:date)
router.get('/wifi-settings', getWifiSettings);
router.put('/wifi-settings', updateWifiSettings);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/logs', getAttendanceLogs);
router.get('/report', getAttendanceLogs);
router.get('/all/:date', getAllAttendanceByDate);
router.put('/:id', updateAttendanceRecord);
router.get('/:date', getAttendanceByDate);

export default router;
