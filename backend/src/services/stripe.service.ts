import Stripe from 'stripe';
import { config } from '../config/index.ts';
import { rideRepository } from '../repositories/ride.repository.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';
import { logger } from '../utils/logger.ts';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!config.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-28.acacia' as any,
    });
  }
  return stripeClient;
}

export const stripeService = {
  async createCheckoutSession(riderId: string, rideId: string, promoCode?: string) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }
    if (ride.rider_id !== riderId) {
      throw new Error('Unauthorized to pay for this ride');
    }
    if (ride.status !== 'ride_completed') {
      throw new Error('Ride must be completed before payment can be processed');
    }

    const existingPayments = await extendedRepository.getPaymentsByRider(riderId);
    const alreadyPaid = existingPayments.find((p) => p.ride_id === rideId && p.status === 'succeeded');
    if (alreadyPaid) {
      throw new Error('This ride has already been successfully paid for.');
    }

    let finalAmount = Number(ride.final_fare || ride.estimated_fare);
    if (promoCode) {
      const promoResult = await extendedRepository.validatePromoCode(promoCode, finalAmount);
      if (promoResult.valid) {
        finalAmount = promoResult.finalFare;
      }
    }

    const stripe = getStripe();
    const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({

          line_items: [
            {
              price_data: {
                currency: 'inr',
                product_data: {
                  name: `RideNova Trip (${ride.reference_id || ride.id.slice(0, 8)})`,
                  description: `${ride.pickup_address} to ${ride.destination_address}`,
                },
                unit_amount: Math.round(finalAmount * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${frontendUrl}/dashboard?payment=success&ride_id=${rideId}`,
          cancel_url: `${frontendUrl}/dashboard?payment=cancelled&ride_id=${rideId}`,
          metadata: {
            rideId,
            riderId,
          },
        });

        await extendedRepository.recordPayment({
          ride_id: rideId,
          rider_id: riderId,
          amount: finalAmount,
          currency: 'INR',
          payment_method: 'card',
          stripe_payment_intent_id: (session.payment_intent as string) || `pi_sess_${session.id}`,
          status: 'pending',
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        logger.error('Error creating Stripe Checkout Session', { error: (error as Error).message });
        throw error;
      }
    }

    // Test mode / fallback simulation when STRIPE_SECRET_KEY is not set
    const mockSessionId = `cs_test_${Date.now()}`;
    const paymentIntentId = `pi_test_${Date.now()}`;

    await extendedRepository.recordPayment({
      ride_id: rideId,
      rider_id: riderId,
      amount: finalAmount,
      currency: 'INR',
      payment_method: 'card',
      stripe_payment_intent_id: paymentIntentId,
      status: 'succeeded',
    });

    if (ride.driver_id) {
      await extendedRepository.recordDriverEarnings({
        driver_id: ride.driver_id,
        ride_id: rideId,
        gross_amount: finalAmount,
      });
    }

    return {
      sessionId: mockSessionId,
      url: `${frontendUrl}/dashboard?payment=success&ride_id=${rideId}`,
      simulated: true,
    };
  },

  async handleWebhook(rawBody: Buffer | string, signature: string) {
    const stripe = getStripe();
    if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe or Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const rideId = session.metadata?.rideId;
      const riderId = session.metadata?.riderId;

      if (rideId && riderId) {
        const payments = await extendedRepository.getAllPayments();
        const payment = payments.find((p) => p.ride_id === rideId);
        if (payment && payment.status !== 'succeeded') {
          await extendedRepository.recordPayment({
            ride_id: rideId,
            rider_id: riderId,
            amount: Number(session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'INR',
            payment_method: 'card',
            stripe_payment_intent_id: (session.payment_intent as string) || payment.stripe_payment_intent_id,
            status: 'succeeded',
          });

          const ride = await rideRepository.findById(rideId);
          if (ride && ride.driver_id) {
            await extendedRepository.recordDriverEarnings({
              driver_id: ride.driver_id,
              ride_id: rideId,
              gross_amount: Number(session.amount_total || 0) / 100,
            });
          }
        }
      }
    }

    return { received: true };
  },
};
