// ── src/validators/task.validator.js ──

import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ============================================================
// COMMON HELPERS
// ============================================================

const preprocessSingleString = (schema) =>
  z.preprocess(
    (val) => Array.isArray(val) ? val[0] : val,
    schema
  );

const objectIdSchema = (fieldName) =>
  preprocessSingleString(
    z.string().regex(objectIdRegex, {
      message: `Invalid format for ${fieldName}`
    })
  );

// ============================================================
// VALID TASK STATUSES
// ============================================================

const TASK_STATUSES = [
  'pending',
  'in-progress',
  'in_progress',
  'completed',
  'done',
  'cancelled',
  'on-hold',
  'on_hold'
];

const TASK_PRIORITIES = [
  'low',
  'medium',
  'high'
];

// ============================================================
// CREATE TASK
// ============================================================

export const createTaskSchema = z.object({
  title: preprocessSingleString(
    z.string({
      required_error: 'Title is required'
    })
      .trim()
      .min(1, {
        message: 'Title cannot be empty'
      })
  ),

  description: preprocessSingleString(
    z.string()
      .trim()
      .optional()
  ),

  assigned_to: z
    .union([
      z.string(),
      z.array(z.any())
    ])
    .optional(),

  designation_id: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .transform(val =>
        val === '' ? undefined : val
      )
  ),

  client: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  project: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  dueDate: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  priority: preprocessSingleString(
    z.enum(TASK_PRIORITIES)
      .optional()
  ),

  status: preprocessSingleString(
    z.enum(TASK_STATUSES)
      .optional()
  ),

  links: z
    .string()
    .optional()
    .or(z.array(z.any()))
    .optional(),

  subtasks: z
    .string()
    .optional()
    .or(z.array(z.any()))
    .optional()
})
.passthrough();

// ============================================================
// UPDATE TASK
// ============================================================

export const updateTaskSchema = z.object({
  title: preprocessSingleString(
    z.string()
      .trim()
      .min(1, {
        message: 'Title cannot be empty'
      })
      .optional()
  ),

  description: preprocessSingleString(
    z.string()
      .trim()
      .optional()
  ),

  assigned_to: z
    .union([
      z.string(),
      z.array(z.any())
    ])
    .optional(),

  designation_id: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  client: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  project: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  dueDate: preprocessSingleString(
    z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal(null))
      .transform(val =>
        val === '' || val === null
          ? undefined
          : val
      )
  ),

  links: z
    .string()
    .optional()
    .or(z.array(z.any()))
    .optional(),

  subtasks: z
    .string()
    .optional()
    .or(z.array(z.any()))
    .optional(),

  status: preprocessSingleString(
    z.enum(TASK_STATUSES)
      .optional()
  ),

  priority: preprocessSingleString(
    z.enum(TASK_PRIORITIES)
      .optional()
  )
})
.passthrough();

// ============================================================
// UPDATE TASK STATUS
// ============================================================

export const updateStatusQuerySchema = z.object({
  status: preprocessSingleString(
    z.enum(TASK_STATUSES, {
      errorMap: () => ({
        message:
          `Status must be one of: ${TASK_STATUSES.join(', ')}`
      })
    })
  )
})
.passthrough();

// ============================================================
// TASK ID PARAMETER
// ============================================================

export const taskIdParamsSchema = z.object({
  task_id: objectIdSchema('task_id')
})
.passthrough();

// ============================================================
// SUBTASK PARAMETERS
// ============================================================

export const subtaskParamsSchema = z.object({
  task_id: objectIdSchema('task_id'),

  subtask_id: objectIdSchema('subtask_id')
})
.passthrough();

// ============================================================
// COMMENT PARAMETERS
// ============================================================

export const commentParamsSchema = z.object({
  task_id: objectIdSchema('task_id'),

  comment_id: objectIdSchema('comment_id')
})
.passthrough();

export const attachmentParamsSchema = z.object({
  task_id: objectIdSchema('task_id'),
  attachment_id: objectIdSchema('attachment_id')
})
.passthrough();

// ============================================================
// USER TASK QUERY
// ============================================================

export const userTasksQuerySchema = z.object({
  user_id: objectIdSchema('user_id')
})
.passthrough();

// ============================================================
// USER ID PARAMETER
// ============================================================

export const userIdParamsSchema = z.object({
  user_id: objectIdSchema('user_id')
})
.passthrough();

// ============================================================
// USER STATUS
// ============================================================

export const userStatusBodySchema = z.object({
  status: z.enum(
    [
      'active',
      'inactive',
      'suspended'
    ],
    {
      errorMap: () => ({
        message:
          "Status must be one of: 'active', 'inactive', 'suspended'"
      })
    }
  )
})
.passthrough();

// ============================================================
// ADD TASK COMMENT
// ============================================================
// Comment text is optional here because the controller allows:
// 1. Text-only comment
// 2. File-only comment
// 3. Text + file
//
// The controller performs the final check that at least one
// of comment text or attachment exists.
// ============================================================

export const addCommentSchema = z.object({
  comment: preprocessSingleString(
    z.string()
      .trim()
      .max(5000, {
        message:
          'Comment cannot exceed 5000 characters'
      })
      .optional()
  ),

  text: preprocessSingleString(
    z.string()
      .trim()
      .max(5000, {
        message:
          'Comment cannot exceed 5000 characters'
      })
      .optional()
  )
})
.passthrough();

// ============================================================
// UPDATE TASK COMMENT
// ============================================================

export const updateCommentSchema = z.object({
  comment: preprocessSingleString(
    z.string()
      .trim()
      .max(5000, {
        message:
          'Comment cannot exceed 5000 characters'
      })
      .optional()
  ),

  text: preprocessSingleString(
    z.string()
      .trim()
      .max(5000, {
        message:
          'Comment cannot exceed 5000 characters'
      })
      .optional()
  )
})
.passthrough();

// ============================================================
// VALIDATION MIDDLEWARE - BODY
// ============================================================

export const validateBody = (schema) => (
  req,
  res,
  next
) => {
  try {
    req.body = schema.parse(
      req.body || {}
    );

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message:
          'Validation error in request body',
        errors: error.errors.map(err => ({
          field:
            err.path.join('.'),
          message:
            err.message
        }))
      });
    }

    next(error);
  }
};

// ============================================================
// VALIDATION MIDDLEWARE - QUERY
// ============================================================

export const validateQuery = (schema) => (
  req,
  res,
  next
) => {
  try {
    req.query = schema.parse(
      req.query || {}
    );

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message:
          'Validation error in query parameters',
        errors: error.errors.map(err => ({
          field:
            err.path.join('.'),
          message:
            err.message
        }))
      });
    }

    next(error);
  }
};

// ============================================================
// VALIDATION MIDDLEWARE - PARAMS
// ============================================================

export const validateParams = (schema) => (
  req,
  res,
  next
) => {
  try {
    req.params = schema.parse(
      req.params || {}
    );

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message:
          'Validation error in route parameters',
        errors: error.errors.map(err => ({
          field:
            err.path.join('.'),
          message:
            err.message
        }))
      });
    }

    next(error);
  }
};
