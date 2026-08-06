import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import checkAuth, { restrictToDepartment } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../validators/task.validator.js';
import {
  createLeadSchema,
  updateLeadSchema,
  bulkUpdateStatusSchema,
  addFollowUpSchema,
  updateStatusSchema
} from '../validators/lead.validator.js';
import { apiRateLimiter, leadMutationRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Middleware to check authorization for department (Marketing or Telecaller) or role ID 3 (Employee)
const authorizeLeadsAccess = async (req, res, next) => {
  let userDeptId = req.user?.departmentId;
  const userRoleId = String(req.user?.role_id || req.user?.role || '').trim();

  // Fallback: If departmentId is missing from token, query from DB
  if (!userDeptId && req.user?.id) {
    try {
      const User = (await import('../models/user.model.js')).default;
      const userObj = await User.findById(req.user.id);
      if (userObj) {
        userDeptId = userObj.departmentId;
      }
    } catch (err) {
      console.error("Failed to fetch user department fallback:", err);
    }
  }

  userDeptId = String(userDeptId || '').trim();

  const allowedDepartments = ['6a211b6621f80bb8da167efb', '6a26a7d72a56a1f9c49da8a3'];
  const allowedRoles = ['3', '1', '2', 'hr', 'admin'];

  const hasDeptAccess = allowedDepartments.includes(userDeptId);
  const hasRoleAccess = allowedRoles.includes(userRoleId);

  if (!hasDeptAccess && !hasRoleAccess) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Exclusive to marketing, telecallers, or authorized roles.'
    });
  }

  next();
};

// Middleware to restrict edit/delete/mutation operations for Admin on Telecaller leads
const restrictAdminMutations = (req, res, next) => {
  const userRole = String(req.user?.role || req.user?.role_id || req.user?.roleId || '').toLowerCase().trim();
  const isAdmin = ['1', '2', 'admin', 'superadmin'].includes(userRole);

  if (isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admins have view-only access to telecaller leads and cannot edit or delete leads.'
    });
  }

  next();
};

router.use(checkAuth);
router.use(authorizeLeadsAccess);


// GET ALL LEADS (supporting filters, search, and pagination) - View access allowed for Admin
router.get('/', apiRateLimiter, leadController.getLeads);

// GET SINGLE LEAD BY ID - View access allowed for Admin
router.get('/:id', apiRateLimiter, leadController.getLeadById);

// CREATE LEAD (with Zod validation, rate limiting, blocked for Admin)
router.post('/create', leadMutationRateLimiter, restrictAdminMutations, validateBody(createLeadSchema), leadController.createLead);

// BULK UPDATE LEAD STATUS (blocked for Admin)
router.put('/update', leadMutationRateLimiter, restrictAdminMutations, validateBody(bulkUpdateStatusSchema), leadController.bulkUpdateStatus);

// UPDATE SINGLE LEAD (blocked for Admin)
router.put('/:id', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateLeadSchema), leadController.updateLead);
router.post('/update/:id', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateLeadSchema), leadController.updateLead);
router.post('/update', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateLeadSchema), leadController.updateLead);

// LOG FOLLOW-UP ACTION (blocked for Admin)
router.post('/followup', leadMutationRateLimiter, restrictAdminMutations, validateBody(addFollowUpSchema), leadController.addFollowUp);
router.post('/followup/:id', leadMutationRateLimiter, restrictAdminMutations, validateBody(addFollowUpSchema), leadController.addFollowUp);

// UPDATE LEAD STATUS (blocked for Admin)
router.patch('/status-update', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateStatusSchema), leadController.updateStatus);
router.patch('/status-update/:id', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateStatusSchema), leadController.updateStatus);
router.post('/status-update', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateStatusSchema), leadController.updateStatus);
router.post('/status-update/:id', leadMutationRateLimiter, restrictAdminMutations, validateBody(updateStatusSchema), leadController.updateStatus);

// DELETE LEAD (blocked for Admin)
router.delete('/delete/:id', leadMutationRateLimiter, restrictAdminMutations, leadController.deleteLead);
router.post('/delete/:id', leadMutationRateLimiter, restrictAdminMutations, leadController.deleteLead);
router.delete('/:id', leadMutationRateLimiter, restrictAdminMutations, leadController.deleteLead);
router.delete('/delete', leadMutationRateLimiter, restrictAdminMutations, leadController.deleteLead);
router.post('/delete', leadMutationRateLimiter, restrictAdminMutations, leadController.deleteLead);

// BULK IMPORT LEADS (blocked for Admin)
router.post('/import', leadMutationRateLimiter, restrictAdminMutations, leadController.importLeads);

export default router;
