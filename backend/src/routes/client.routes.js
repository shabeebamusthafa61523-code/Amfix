import { Router } from 'express';
import protectRoute, { requireRole } from '../middleware/auth.middleware.js';
import * as clientController from '../controllers/client.controller.js';
import { createClientValidator, updateClientValidator } from '../validators/client.validator.js';

const router = Router();

// Apply standard authentication middleware to all client endpoints
router.use(protectRoute);

// Read Client Endpoints (Accessible to all authenticated users with permission)
router.get('/', clientController.getClients);
router.get('/export', clientController.exportClients);
router.get('/:id', clientController.getClientById);

// Create Client Endpoint
router.post(
  '/',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee', 'digital_marketer']),
  createClientValidator,
  clientController.createClient
);

// Update Client Endpoint
router.put(
  '/:id',
  requireRole(['admin', '1', '2', '3', '10', 'md', 'hr', 'manager', 'team_lead', 'employee', 'digital_marketer']),
  updateClientValidator,
  clientController.updateClient
);

// Delete Client Endpoint
router.delete(
  '/:id',
  requireRole(['admin', '1', '2', '10', 'md', 'hr', 'manager']),
  clientController.deleteClient
);

export default router;
