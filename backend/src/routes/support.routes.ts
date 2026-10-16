import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/support/tickets
 * Get tickets for current user, or all for admin
 */
router.get('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }

    let tickets;
    if (req.user.role === 'admin') {
      tickets = await extendedRepository.getAllSupportTickets();
    } else {
      tickets = await extendedRepository.getUserTickets(req.user.id);
    }

    res.status(200).json({ success: true, data: tickets, count: tickets.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/support/tickets
 * Create a new support grievance ticket
 */
router.post('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }

    const { category, subject, description, priority } = req.body || {};

    if (!category || !subject || !description) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Category, subject, and description are required.' },
      });
      return;
    }

    const ticket = await extendedRepository.createSupportTicket({
      user_id: req.user.id,
      category,
      subject,
      description,
      priority,
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted. Our 24/7 team will resolve this shortly.',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/support/tickets/:id
 * Update ticket status (Admin only)
 */
router.patch('/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be open, in_progress, resolved, or closed' },
      });
      return;
    }

    const updated = await extendedRepository.updateTicketStatus(id, status);
    res.status(200).json({ success: true, message: `Ticket status set to '${status}'`, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
