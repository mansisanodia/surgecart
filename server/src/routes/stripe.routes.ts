import express, { Router } from 'express';
import { StripeController } from '../controllers/stripe.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Stripe Webhook needs the raw request body as a buffer
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  StripeController.handleWebhook
);

// Local testing endpoint to mock payment success
router.post('/mock-payment-success', authMiddleware, StripeController.mockPaymentSuccess);

export default router;
