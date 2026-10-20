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
    const { 
      code, 
      discount_type, 
      discount_value, 
      minimum_fare, 
      maximum_discount, 
      usage_limit, 
      starts_at, 
      expires_at,
      is_active,
    } = req.body || {};
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
      starts_at,
      expires_at,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    res.status(201).json({ success: true, message: 'Promo code created successfully.', data: created });
  } catch (err: any) {
    if (err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('UNIQUE')) {
      res.status(409).json({
        success: false,
        error: { code: 'PROMO_EXISTS', message: 'A promo code with this name already exists. Please choose a unique code.' },
      });
      return;
    }
    next(err);
  }
});

/**
 * PUT /api/promos/:id
 * Admin update promo code
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await extendedRepository.updatePromo(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Promo not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Promo updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/promos/:id
 * Admin delete promo code
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await extendedRepository.deletePromo(id);
    if (!deleted) {
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Promo could not be deleted (might be in use).' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Promo deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
