import { Router } from 'express';
import { mdDashboardController } from '../controllers/mdDashboard.controller.js';
import protectRoute from '../middleware/auth.middleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

router.use(protectRoute);
router.use(apiRateLimiter);

router.get('/', mdDashboardController.getMdMetrics);

export default router;
