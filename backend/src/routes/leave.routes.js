import { Router } from 'express';
import verifyJWT from '../middleware/auth.middleware.js';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getTeamLeaveRequests,
  getAllLeaveRequests,
  approveOrRejectLeave,
  cancelLeaveRequest
} from '../controllers/leave.controller.js';

const router = Router();

router.use(verifyJWT);

// Employee routes
router.post('/', createLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.delete('/:id', cancelLeaveRequest);

// Manager / Team Lead routes
router.get('/team', getTeamLeaveRequests);

// HR / Admin routes
router.get('/all', getAllLeaveRequests);

// Action route for TL & HR
router.put('/:id/action', approveOrRejectLeave);

export default router;
