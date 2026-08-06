import { body } from 'express-validator';

export const createClientValidator = [
  body('companyName').notEmpty().withMessage('Company Name is required').trim(),
  body('clientName').notEmpty().withMessage('Client Name is required').trim(),
  body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('status').optional().isIn(['Active', 'Inactive', 'On Hold', 'Lead', 'Archived']),
  body('clientType').optional().isIn(['Enterprise', 'SMB', 'Startup', 'Government', 'Retainer', 'One-Time']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'VIP']),
  body('ndaStatus').optional().isIn(['Signed', 'Pending', 'Not Applicable'])
];

export const updateClientValidator = [
  body('companyName').optional().notEmpty().trim(),
  body('clientName').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['Active', 'Inactive', 'On Hold', 'Lead', 'Archived']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'VIP'])
];
