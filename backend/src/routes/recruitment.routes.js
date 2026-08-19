// ── src/routes/recruitment.routes.js ──
import { Router } from 'express';
import verifyJWT from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  getAllCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate
} from '../controllers/recruitment.controller.js';

const router = Router();

// Protect all recruitment endpoints with JWT
router.use(verifyJWT);

router.get('/', getAllCandidates);
router.post('/', upload.any(), createCandidate);
router.put('/:id', upload.any(), updateCandidate);
router.delete('/:id', deleteCandidate);

export default router;
