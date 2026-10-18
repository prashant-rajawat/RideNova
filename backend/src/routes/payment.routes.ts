import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';
import { stripeService } from '../services/stripe.service.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';

const router = Router();

/**
 * POST /api/payments/checkout-session
 * Create Stripe Checkout session for a completed ride
 */
router.post('/checkout-session', requireAuth, requireRole('rider'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { rideId, promoCode } = req.body || {};
    if (!rideId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Ride ID is required' } });
      return;
    }

    const sessionData = await stripeService.createCheckoutSession(req.user.id, rideId, promoCode);
    res.status(200).json({
      success: true,
      message: 'Stripe Checkout session created successfully.',
      data: sessionData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/ride/:rideId
 * Get payment status for a specific ride
 */
router.get('/ride/:rideId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { rideId } = req.params;
    const payments = await extendedRepository.getPaymentsByRider(req.user.id);
    const payment = payments.find((p) => p.ride_id === rideId);

    res.status(200).json({
      success: true,
      data: payment || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks/stripe
 * Stripe Webhook Handler (expects raw body buffer)
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.body; // Buffer from express.raw middleware

    const result = await stripeService.handleWebhook(rawBody, signature);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
