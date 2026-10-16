import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';

const router = Router();

/**
 * GET /api/promos
 * Public/Rider list of active promo codes
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promos = await extendedRepository.getAllPromos();
    res.status(200).json({ success: true, data: promos });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/promos/validate
 * Validate a code against an estimated fare
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, fare } = req.body || {};
    if (!code || typeof fare !== 'number') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Promo code string and ride fare number are required.' },
      });
      return;
    }

    const result = await extendedRepository.validatePromoCode(code, fare);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/promos
 * Admin create new promo code
 */
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discount_type, discount_value, minimum_fare, maximum_discount, usage_limit } = req.body || {};
    if (!code || !discount_type || typeof discount_value !== 'number') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Code, discount_type and discount_value are required.' },
      });
      return;
    }

    const created = await extendedRepository.createPromo({
      code,
      discount_type,
      discount_value,
      minimum_fare,
      maximum_discount,
      usage_limit,
    });

    res.status(201).json({ success: true, message: 'Promo code created successfully.', data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
