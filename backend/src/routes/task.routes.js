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
  deleteSubtask,

  // Task collaboration
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
  getTaskComments,
  addTaskAttachments,
  deleteTaskAttachment
} from '../controllers/task.controller.js';

import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusQuerySchema,
  taskIdParamsSchema,
  subtaskParamsSchema,
  commentParamsSchema,
  attachmentParamsSchema,
  userTasksQuerySchema,
  addCommentSchema,
  updateCommentSchema,
  validateBody,
  validateQuery,
  validateParams
} from '../validators/task.validator.js';

const router = Router();


// ============================================================
// GLOBAL AUTHENTICATION
// ============================================================

router.use(verifyJWT);


// ============================================================
// TASK ROUTES
// ============================================================


// ------------------------------------------------------------
// CREATE TASK
// POST /api/v1/tasks/create
// ------------------------------------------------------------

router.post(
  '/create',
  upload.any(),
  validateBody(createTaskSchema),
  createTask
);


// ------------------------------------------------------------
// GET ALL TASKS
// GET /api/v1/tasks/all
// ------------------------------------------------------------

router.get(
  '/all',
  getAllTasks
);


// ------------------------------------------------------------
// GET USER TASKS
// GET /api/v1/tasks/user/tasks?user_id=...
// ------------------------------------------------------------

router.get(
  '/user/tasks',
  validateQuery(userTasksQuerySchema),
  getUserTasks
);


// ------------------------------------------------------------
// GET CURRENT USER TASKS
// GET /api/v1/tasks/current-user/tasks
// ------------------------------------------------------------

router.get(
  '/current-user/tasks',
  getCurrentUserTasks
);


// ------------------------------------------------------------
// DELETE TASK
// DELETE /api/v1/tasks/delete/:task_id
// ------------------------------------------------------------

router.delete(
  '/delete/:task_id',
  validateParams(taskIdParamsSchema),
  deleteTask
);


// ------------------------------------------------------------
// UPDATE TASK STATUS
// PUT /api/v1/tasks/task-status/:task_id?status=...
// ------------------------------------------------------------

router.put(
  '/task-status/:task_id',
  validateParams(taskIdParamsSchema),
  validateQuery(updateStatusQuerySchema),
  updateTaskStatus
);


// ------------------------------------------------------------
// UPDATE TASK
// PUT /api/v1/tasks/update/:task_id
// ------------------------------------------------------------

router.put(
  '/update/:task_id',
  upload.any(),
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  updateTask
);


// ============================================================
// SUBTASK ROUTES
// ============================================================


// ------------------------------------------------------------
// ADD SUBTASK
// POST /api/v1/tasks/:task_id/subtasks
// ------------------------------------------------------------

router.post(
  '/:task_id/subtasks',
  validateParams(taskIdParamsSchema),
  addSubtask
);


// ------------------------------------------------------------
// UPDATE / TOGGLE SUBTASK
// PUT /api/v1/tasks/:task_id/subtasks/:subtask_id
// ------------------------------------------------------------

router.put(
  '/:task_id/subtasks/:subtask_id',
  validateParams(subtaskParamsSchema),
  toggleSubtask
);


// ------------------------------------------------------------
// DELETE SUBTASK
// DELETE /api/v1/tasks/:task_id/subtasks/:subtask_id
// ------------------------------------------------------------

router.delete(
  '/:task_id/subtasks/:subtask_id',
  validateParams(subtaskParamsSchema),
  deleteSubtask
);


// ============================================================
// TASK COLLABORATION - COMMENTS
// ============================================================

router.get(
  '/:task_id/comments',
  validateParams(taskIdParamsSchema),
  getTaskComments
);

// ------------------------------------------------------------
// ADD COMMENT
// POST /api/v1/tasks/:task_id/comments
// ------------------------------------------------------------

router.post(
  '/:task_id/comments',
  upload.any(),
  validateParams(taskIdParamsSchema),
  validateBody(addCommentSchema),
  addTaskComment
);

// ------------------------------------------------------------
// UPDATE COMMENT
// PUT /api/v1/tasks/:task_id/comments/:comment_id
// ------------------------------------------------------------

router.put(
  '/:task_id/comments/:comment_id',
  upload.any(),
  validateParams(commentParamsSchema),
  validateBody(updateCommentSchema),
  updateTaskComment
);

// ------------------------------------------------------------
// DELETE COMMENT
// DELETE /api/v1/tasks/:task_id/comments/:comment_id
// ------------------------------------------------------------

router.delete(
  '/:task_id/comments/:comment_id',
  validateParams(commentParamsSchema),
  deleteTaskComment
);

// ============================================================
// TASK COLLABORATION - ATTACHMENTS
// ============================================================

router.post(
  '/:task_id/attachments',
  upload.any(),
  validateParams(taskIdParamsSchema),
  addTaskAttachments
);

router.delete(
  '/:task_id/attachments/:attachment_id',
  validateParams(attachmentParamsSchema),
  deleteTaskAttachment
);

// ============================================================
// EXPORT ROUTER
// ============================================================

export default router;
