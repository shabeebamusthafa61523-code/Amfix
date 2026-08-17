// ── src/routes/task.routes.js ──

import { Router } from 'express';

import verifyJWT from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

import {
  createTask,
  getAllTasks,
  getUserTasks,
  getCurrentUserTasks,
  deleteTask,
  updateTaskStatus,
  updateTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask
} from '../controllers/task.controller.js';

import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusQuerySchema,
  taskIdParamsSchema,
  subtaskParamsSchema,
  userTasksQuerySchema,
  validateBody,
  validateQuery,
  validateParams
} from '../validators/task.validator.js';

const router = Router();

// ===============================
// Global Auth Middleware
// ===============================

router.use(verifyJWT);

// ===============================
// Routes
// ===============================

// CREATE TASK
router.post(
  '/create',
  upload.any(),
  validateBody(createTaskSchema),
  createTask
);

// GET ALL TASKS
router.get(
  '/all',
  getAllTasks
);

// GET USER TASKS
router.get(
  '/user/tasks',
  validateQuery(userTasksQuerySchema),
  getUserTasks
);

// GET CURRENT USER TASKS
router.get(
  '/current-user/tasks',
  getCurrentUserTasks
);

// DELETE TASK
router.delete(
  '/delete/:task_id',
  validateParams(taskIdParamsSchema),
  deleteTask
);

// UPDATE TASK STATUS
router.put(
  '/task-status/:task_id',
  validateParams(taskIdParamsSchema),
  validateQuery(updateStatusQuerySchema),
  updateTaskStatus
);

// UPDATE TASK
router.put(
  '/update/:task_id',
  validateParams(taskIdParamsSchema),
  upload.any(),
  validateBody(updateTaskSchema),
  updateTask
);

// SUBTASK ROUTES
router.post(
  '/:task_id/subtasks',
  validateParams(taskIdParamsSchema),
  addSubtask
);

router.put(
  '/:task_id/subtasks/:subtask_id',
  validateParams(subtaskParamsSchema),
  toggleSubtask
);

router.delete(
  '/:task_id/subtasks/:subtask_id',
  validateParams(subtaskParamsSchema),
  deleteSubtask
);

export default router;