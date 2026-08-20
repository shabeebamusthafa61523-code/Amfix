import { Router } from 'express';
import protectRoute, { requireRole } from '../middleware/auth.middleware.js';
import * as projectController from '../controllers/project.controller.js';
import * as projectCategoryController from '../controllers/projectCategory.controller.js';
import { createProjectValidator, updateProjectValidator } from '../validators/project.validator.js';
import { createProjectCategoryValidator } from '../validators/projectCategory.validator.js';

const router = Router();

// Apply standard authentication middleware to all project endpoints
router.use(protectRoute);

const projectMutateRoles = ['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee'];

// Read Endpoints
router.get('/', projectController.getProjects);
router.get('/reports', projectController.getProjectReports);
router.get('/categories', projectCategoryController.getProjectCategories);
router.post(
  '/categories',
  requireRole(projectMutateRoles),
  createProjectCategoryValidator,
  projectCategoryController.createProjectCategory
);
router.get('/:id', projectController.getProjectById);
router.get('/:id/visible-work', projectController.getVisibleWork);

// Create Project Endpoint
router.post(
  '/',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee']),
  createProjectValidator,
  projectController.createProject
);

// Update Project Endpoint
router.put(
  '/:id',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee']),
  updateProjectValidator,
  projectController.updateProject
);

// Quick Status Transition Endpoint
router.patch(
  '/:id/status',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee']),
  projectController.updateProjectStatus
);

// Assign/Reassign Team Members
router.post(
  '/:id/assign',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee']),
  projectController.assignWork
);

// Delete Project Endpoint
router.delete(
  '/:id',
  requireRole(['admin', '1', '2', '10', 'md', 'hr', 'manager']),
  projectController.deleteProject
);

export default router;
