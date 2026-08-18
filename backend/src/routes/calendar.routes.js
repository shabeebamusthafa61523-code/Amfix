import { Router } from 'express';
import verifyJWT from '../middleware/auth.middleware.js';

import {
  createCalendarWork,
  getCalendarWorks,
  getMyCalendarWorks,
  getCalendarWorkById,
  updateCalendarWork,
  updateWorkStatus,
  updatePostingStatus,
  deleteCalendarWork
} from '../controllers/calendarWork.controller.js';

import {
  createCalendarWorkSchema,
  updateCalendarWorkSchema,
  updateWorkStatusSchema,
  updatePostingStatusSchema,
  calendarWorkIdParamsSchema,
  validateBody,
  validateParams
} from '../validators/calendarWork.validator.js';

const router = Router();

// ============================================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(verifyJWT);

// ============================================================
// CREATE CALENDAR WORK
// POST /api/calendar-work
// ============================================================

router.post(
  '/',
  validateBody(createCalendarWorkSchema),
  createCalendarWork
);

// ============================================================
// GET ALL CALENDAR WORK (with filters)
// GET /api/calendar-work
// ============================================================

router.get(
  '/',
  getCalendarWorks
);

// ============================================================
// GET MY CALENDAR WORK
// GET /api/calendar-work/my-work
// ============================================================

router.get(
  '/my-work',
  getMyCalendarWorks
);

// ============================================================
// GET CALENDAR WORK BY ID
// GET /api/calendar-work/:id
// ============================================================

router.get(
  '/:id',
  validateParams(calendarWorkIdParamsSchema),
  getCalendarWorkById
);

// ============================================================
// UPDATE CALENDAR WORK
// PUT /api/calendar-work/:id
// ============================================================

router.put(
  '/:id',
  validateParams(calendarWorkIdParamsSchema),
  validateBody(updateCalendarWorkSchema),
  updateCalendarWork
);

// ============================================================
// UPDATE WORK STATUS
// PATCH /api/calendar-work/:id/status
// ============================================================

router.patch(
  '/:id/status',
  validateParams(calendarWorkIdParamsSchema),
  validateBody(updateWorkStatusSchema),
  updateWorkStatus
);

// ============================================================
// UPDATE POSTING STATUS
// PATCH /api/calendar-work/:id/posting-status
// ============================================================

router.patch(
  '/:id/posting-status',
  validateParams(calendarWorkIdParamsSchema),
  validateBody(updatePostingStatusSchema),
  updatePostingStatus
);

// ============================================================
// DELETE CALENDAR WORK
// DELETE /api/calendar-work/:id
// ============================================================

router.delete(
  '/:id',
  validateParams(calendarWorkIdParamsSchema),
  deleteCalendarWork
);

export default router;
