import { Router } from 'express';
import express from 'express';
import { handleRazorpayWebhook } from '../controllers/webhooks';

const router = Router();

// VERY IMPORTANT: Webhook signature verification requires the RAW request body.
// We apply express.raw() only to this route, before the global express.json() parses it.
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

export default router;
