import { Router } from 'express';
import { healthController } from '../controllers/health.controller.ts';

const router = Router();

// GET /api/health - General API service health
router.get('/', healthController.getApiHealth);

// GET /api/health/db - Supabase PostgreSQL connection health
router.get('/db', healthController.getDbHealth);

export default router;
