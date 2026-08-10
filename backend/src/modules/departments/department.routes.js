// src/modules/departments/department.routes.js

import { Router } from 'express';
import { body } from 'express-validator';
import { departmentController } from './department.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require token authentication
router.use(verifyToken);

// ==========================================
// READ-ONLY ROUTES (Allowed for all logged in staff)
// ==========================================
router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.get('/:id/users', departmentController.getUsers);
router.get('/:id/analytics', departmentController.getAnalytics);

// ==========================================
// MUTATING ROUTES (Restricted to Admin/Manager/SuperAdmin)
// ==========================================
router.post(
  '/:id/users',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  [
    body('userId').trim().notEmpty().withMessage('User ID is required')
  ],
  departmentController.addUser
);

router.delete(
  '/:id/users/:userId',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  departmentController.removeUser
);

router.post(
  '/create',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('code').trim().notEmpty().withMessage('Department code is required')
  ],
  departmentController.create
);

router.put(
  '/update',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  [
    body('id').trim().notEmpty().withMessage('Department ID is required'),
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('code').trim().notEmpty().withMessage('Department code is required')
  ],
  departmentController.update
);

router.delete(
  '/:id',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  departmentController.delete
);

router.put(
  '/:id/manager',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  departmentController.assignManager
);

router.patch(
  '/:id/status',
  requireRole(['admin', 'manager', 'superadmin', '0', '1', '2']),
  departmentController.toggleStatus
);

// ==========================================
// LOCAL ROUTER CENTRAL ERROR HANDLER
// ==========================================
router.use((err, req, res, next) => {
  console.error('Department Module Route Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred';
  const data = err.data || null;

  return res.status(statusCode).json({
    success: false,
    message,
    data
  });
});

export default router;
