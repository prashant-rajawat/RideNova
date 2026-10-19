import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';
import { stripeService } from '../services/stripe.service.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';

const router = Router();

/**
 * GET /api/payments/settings
 * Get public payment settings (UPI ID, QR code, available methods)
 */
router.get('/settings', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await extendedRepository.getPaymentSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/manual-upi
 * Submit manual UPI payment with UTR number
 */
router.post('/manual-upi', requireAuth, requireRole('rider'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }

    const { rideId, amount, utrNumber } = req.body || {};
    if (!rideId || !amount || !utrNumber) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Ride ID, amount, and UTR number are required.' },
      });
      return;
    }

    const payment = await extendedRepository.submitManualUpiPayment(rideId, req.user.id, Number(amount), utrNumber.trim());
    res.status(200).json({
      success: true,
      message: 'Manual UPI payment submitted successfully. Status: Pending Verification.',
      data: payment,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/payments/settings
 * Admin get payment settings
 */
router.get('/admin/settings', requireAuth, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await extendedRepository.getPaymentSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/payments/settings
 * Admin update payment settings (UPI ID, QR URL, commission rules, toggles)
 */
router.put('/admin/payments/settings', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { upi_id, upi_qr_url, commission_type, commission_value, stripe_enabled, manual_upi_enabled } = req.body || {};
    
    if (commission_type && !['percentage', 'fixed'].includes(commission_type)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_COMMISSION_TYPE', message: 'Commission type must be percentage or fixed.' } });
      return;
    }

    if (commission_value !== undefined && (isNaN(Number(commission_value)) || Number(commission_value) < 0)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_COMMISSION_VALUE', message: 'Commission value must be a valid positive number.' } });
      return;
    }

    const updated = await extendedRepository.updatePaymentSettings({
      upi_id,
      upi_qr_url,
      commission_type,
      commission_value: commission_value !== undefined ? Number(commission_value) : undefined,
      stripe_enabled,
      manual_upi_enabled,
    });

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/payments/:id/verify-upi
 * Admin verify manual UPI payment
 */
router.post('/admin/payments/:id/verify-upi', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const verified = await extendedRepository.verifyManualUpiPayment(id);
    if (!verified) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment record not found.' } });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Manual UPI payment verified successfully and driver earnings updated.',
      data: verified,
    });
  } catch (err) {
    next(err);
  }
});

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
 * GET /api/payments/methods
 * Get active payment methods for customer checkout
 */
router.get('/methods', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const methods = await extendedRepository.getPaymentMethods();
    res.status(200).json({ success: true, data: methods.filter((m: any) => m.is_active) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/commission-settings
 * Admin get commission & fare rules
 */
router.get('/admin/commission-settings', requireAuth, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await extendedRepository.getCommissionSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/commission-settings
 * Admin update commission & fare rules
 */
router.put('/admin/commission-settings', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await extendedRepository.updateCommissionSettings(req.body);
    res.status(200).json({ success: true, message: 'Commission & fare settings updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/payment-methods
 * Admin get all payment methods
 */
router.get('/admin/payment-methods', requireAuth, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const methods = await extendedRepository.getPaymentMethods();
    res.status(200).json({ success: true, data: methods });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/payment-methods
 * Admin create payment method
 */
router.post('/admin/payment-methods', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await extendedRepository.createPaymentMethod(req.body);
    res.status(200).json({ success: true, message: 'Payment method created successfully.', data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/payment-methods/:id
 * Admin update payment method
 */
router.put('/admin/payment-methods/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await extendedRepository.updatePaymentMethod(id, req.body);
    res.status(200).json({ success: true, message: 'Payment method updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/payment-methods/:id
 * Admin delete payment method
 */
router.delete('/admin/payment-methods/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await extendedRepository.deletePaymentMethod(id);
    res.status(200).json({ success: true, message: 'Payment method deleted successfully.' });
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
    const rawBody = req.body;

    const result = await stripeService.handleWebhook(rawBody, signature);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;

