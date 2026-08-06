import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import checkAuth from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// ==========================================
// ROLE VALIDATION
// ==========================================

const requireRole = (allowedRoles) => {
  return (req, res, next) => {

    const userRole =
      req.user?.role ||
      req.user?.role_id;

    if (
      !userRole ||
      !allowedRoles.includes(String(userRole))
    ) {
      return res.status(403).json({
        detail:
          'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

router.use(checkAuth);

// ==========================================
// USER ROUTES
// ==========================================

// CHANGE PASSWORD (self)
router.post(
  '/change-password',
  userController.changePassword
);

// GET ALL USERS
router.get(
  '/',
  userController.getUsers
);

// SIMPLE USER LIST
router.get(
  '/list',
  userController.getUserList
);

// GET USER BY ID
router.get(
  '/:id',
  userController.getUserById
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// CREATE USER
router.post(
  '/create',
  upload.single('profileImage'),
  userController.createUser
);
router.post(
  '/',
  upload.single('profileImage'),
  userController.createUser
);

// UPDATE USER
router.put(
  '/update/:id',
  upload.single('profileImage'),
  userController.updateUser
);
router.post(
  '/update/:id',
  upload.single('profileImage'),
  userController.updateUser
);
router.put(
  '/:id',
  upload.single('profileImage'),
  userController.updateUser
);
router.put(
  '/update',
  upload.single('profileImage'),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);
router.post(
  '/update',
  upload.single('profileImage'),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);

// CHANGE ROLE
router.patch(
  '/:id/role',
  userController.changeUserRole
);

// UPDATE PERMISSIONS & SIDEBAR ACCESS
router.put(
  '/:id/permissions',
  userController.updatePermissions
);
router.post(
  '/:id/permissions',
  userController.updatePermissions
);

// DEACTIVATE USER
router.patch(
  '/:id/deactivate',
  userController.deactivateUser
);

// DELETE USER
router.delete(
  '/delete/:id',
  userController.deleteUser
);
router.post(
  '/delete/:id',
  userController.deleteUser
);
router.delete(
  '/:id',
  userController.deleteUser
);
router.delete(
  '/delete',
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);
router.post(
  '/delete',
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);

export default router;