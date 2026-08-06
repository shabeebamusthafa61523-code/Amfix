// ── src/validators/task.validator.js ──
import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Common Schemas
const objectIdSchema = (fieldName) => 
  z.string()
    .regex(objectIdRegex, { message: `Invalid format for ${fieldName}` });

// Body validation for creating a task
export const createTaskSchema = z.object({
  title: z.string({ required_error: 'Title is required' })
    .trim()
    .min(1, { message: 'Title cannot be empty' }),
  description: z.string().trim().optional(),
  assigned_to: objectIdSchema('assigned_to'),
  designation_id: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
  client: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' || val === null ? undefined : val),
  project: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' || val === null ? undefined : val),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
  links: z.string().optional().or(z.array(z.any())).optional()
}).passthrough();

// Body validation for updating a task
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, { message: 'Title cannot be empty' }).optional(),
  description: z.string().trim().optional(),
  assigned_to: objectIdSchema('assigned_to').optional(),
  designation_id: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' ? undefined : val),
  client: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' || val === null ? undefined : val),
  project: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' || val === null ? undefined : val),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null))
    .transform(val => val === '' ? undefined : val),
  links: z.string().optional().or(z.array(z.any())).optional()
}).passthrough();

// Query validation for updating task status
export const updateStatusQuerySchema = z.object({
  status: z.enum(['pending', 'current', 'preview', 'done'], {
    errorMap: () => ({ message: "Status must be one of: 'pending', 'current', 'preview', 'done'" })
  })
});

// Params validation for task_id
export const taskIdParamsSchema = z.object({
  task_id: objectIdSchema('task_id')
});

// Query validation for fetching user tasks
export const userTasksQuerySchema = z.object({
  user_id: objectIdSchema('user_id')
});

// Params validation for user_id status update
export const userIdParamsSchema = z.object({
  user_id: objectIdSchema('user_id')
});

// Body validation for User status update
export const userStatusBodySchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended'], {
    errorMap: () => ({ message: "Status must be one of: 'active', 'inactive', 'suspended'" })
  })
});

// Validation Middleware Helpers
export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error in request body',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error in query parameters',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error in route parameters',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};
