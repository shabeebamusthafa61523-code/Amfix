import { body } from 'express-validator';

export const createProjectValidator = [
  body('projectName').notEmpty().withMessage('Project Name is required').trim(),
  body('client').notEmpty().withMessage('Client selection is required').isMongoId().withMessage('Invalid Client ID'),
  body('projectManager').notEmpty().withMessage('Project Manager selection is required').isMongoId().withMessage('Invalid Project Manager ID'),
  body('deadline').notEmpty().withMessage('Project Deadline date is required').isISO8601().withMessage('Invalid Date format'),
  // MANDATORY ASSIGNED EMPLOYEES ARRAY VALIDATION
  body('assignedEmployees')
    .isArray({ min: 1 })
    .withMessage('Assigned Employees field is mandatory and must contain at least one employee')
    .custom((arr) => arr.every(id => typeof id === 'string' && id.length === 24))
    .withMessage('Each assigned employee must be a valid Mongo ObjectId'),
  body('status').optional().isIn(['Planning', 'Requirement Gathering', 'UI Design', 'Development', 'Testing', 'Client Review', 'Changes', 'Deployment', 'Completed', 'On Hold', 'Cancelled']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent'])
];

export const updateProjectValidator = [
  body('projectName').optional().notEmpty().trim(),
  body('assignedEmployees').optional().isArray({ min: 1 }).withMessage('Assigned Employees cannot be empty when provided'),
  body('status').optional().isIn(['Planning', 'Requirement Gathering', 'UI Design', 'Development', 'Testing', 'Client Review', 'Changes', 'Deployment', 'Completed', 'On Hold', 'Cancelled']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent'])
];
