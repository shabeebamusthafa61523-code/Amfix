import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  createNotification,
  getMyNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notification.controller.js';

const router = Router();

// Protect all notification routes
router.use(protectRoute);

router.post('/', createNotification);
router.get('/my-notifications', getMyNotifications);
router.get('/', getAllNotifications);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
