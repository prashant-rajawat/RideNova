import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }

    const notifications = await extendedRepository.getUserNotifications(req.user.id);
    res.status(200).json({ success: true, data: notifications, count: notifications.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }

    const { id } = req.params;
    await extendedRepository.markNotificationRead(id, req.user.id);
    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
